const db = require('../config/db');

/**
 * High-Throughput In-Memory Micro-Batch Submission Queue
 * 
 * Solves the "10:14 AM Classroom Rush":
 * When 300-500 students submit feedback at the exact same second, this queue
 * batches their writes into consolidated bulk operations every 500ms.
 * 
 * Key Advantages:
 * 1. Consolidates faculty scorecard updates in memory (reducing database writes by up to 98%).
 * 2. Prevents connection pool starvation on Render (512 MB dyno, 10 connections).
 * 3. Eliminates row-level lock contention on TiDB Cloud Serverless.
 */

class SubmissionQueue {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 50;
    this.flushIntervalMs = options.flushIntervalMs || 500;
    this.queue = [];
    this.isFlushing = false;
    this.timer = null;

    this.start();
  }

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => {
        if (this.queue.length > 0 && !this.isFlushing) {
          this.flush().catch(err => {
            console.error("❌ [SubmissionQueue Flush Error]:", err.message);
          });
        }
      }, this.flushIntervalMs);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Enqueue a submission payload
   * @param {Object} payload 
   */
  enqueue(payload) {
    this.queue.push(payload);
    if (this.queue.length >= this.batchSize && !this.isFlushing) {
      // Immediate flush when batch threshold is met
      this.flush().catch(err => {
        console.error("❌ [SubmissionQueue Flush Error]:", err.message);
      });
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Consolidate scorecard entries in Node memory
   * Reduces hundreds of duplicate SQL updates to 1 per unique faculty course session
   */
  consolidateScorecards(items) {
    const consolidated = new Map();

    for (const item of items) {
      for (const sc of (item.scorecardUpdatesToInsert || [])) {
        const key = `${sc.dept_id}__${sc.faculty_id}__${sc.course_id}__${sc.session_id}`;
        const rawSum = sc.rawSum !== undefined ? sc.rawSum : sc.sum;
        const rawCount = sc.rawCount !== undefined ? sc.rawCount : sc.count;

        if (!consolidated.has(key)) {
          consolidated.set(key, { ...sc, rawSum, rawCount });
        } else {
          const existing = consolidated.get(key);
          existing.sum += sc.sum;
          existing.count += sc.count;
          existing.genuineCount += sc.genuineCount;
          existing.excellent += sc.excellent;
          existing.good += sc.good;
          existing.average += sc.average;
          existing.poor += sc.poor;
          existing.rawSum += rawSum;
          existing.rawCount += rawCount;
        }
      }
    }

    return Array.from(consolidated.values());
  }

  /**
   * Process and flush a batch of queued submissions
   */
  async flush() {
    if (this.isFlushing || this.queue.length === 0) return 0;
    this.isFlushing = true;

    const batch = this.queue.splice(0, this.batchSize);
    const count = batch.length;

    try {
      const trx = await db.transaction();

      try {
        // 1. Bulk insert all ratings across all students in the batch
        const allRatings = batch.flatMap(item => item.ratingsToInsert || []);
        if (allRatings.length > 0) {
          await trx.batchInsert('global_student_feedback', allRatings, 100);
        }

        // 2. Bulk insert faculty remarks
        const allFacultyRemarks = batch.flatMap(item => item.facultyRemarksToInsert || []);
        if (allFacultyRemarks.length > 0) {
          await trx('global_faculty_remarks').insert(allFacultyRemarks);
        }

        // 3. Bulk insert section remarks
        const allSectionRemarks = batch.flatMap(item => item.sectionRemarksToInsert || []);
        if (allSectionRemarks.length > 0) {
          await trx('global_section_remarks').insert(allSectionRemarks);
        }

        // 4. In-Memory Consolidated Scorecards: One update per unique faculty
        const consolidatedScorecards = this.consolidateScorecards(batch);
        for (const score of consolidatedScorecards) {
          await trx.raw(`
            INSERT INTO global_faculty_scorecards (
              dept_id, faculty_id, course_id, session_id, total_score_sum, ratings_count, genuine_count, excellent_count, good_count, average_count, poor_count, raw_score_sum, raw_ratings_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              total_score_sum = total_score_sum + VALUES(total_score_sum),
              ratings_count = ratings_count + VALUES(ratings_count),
              genuine_count = genuine_count + VALUES(genuine_count),
              excellent_count = excellent_count + VALUES(excellent_count),
              good_count = good_count + VALUES(good_count),
              average_count = average_count + VALUES(average_count),
              poor_count = poor_count + VALUES(poor_count),
              raw_score_sum = raw_score_sum + VALUES(raw_score_sum),
              raw_ratings_count = raw_ratings_count + VALUES(raw_ratings_count)
          `, [
            score.dept_id, score.faculty_id, score.course_id, score.session_id, 
            score.sum, score.count, score.genuineCount, score.excellent, 
            score.good, score.average, score.poor,
            score.rawSum, score.rawCount
          ]);
        }

        // 5. Bulk insert department remarks
        const allDeptRemarks = batch
          .filter(item => item.department_remark && item.department_remark.trim() !== '')
          .map(item => ({
            session_id: item.session_id,
            dept_id: item.dept_id,
            remark_text: item.department_remark.trim()
          }));
        if (allDeptRemarks.length > 0) {
          await trx('global_session_remarks').insert(allDeptRemarks);
        }

        await trx.commit();

        console.log(`🚀 [SubmissionQueue] Flushed batch of ${count} submissions (${allRatings.length} ratings, ${consolidatedScorecards.length} consolidated scorecard updates)`);

        // Realtime notifications for affected sessions
        const notifiedSessions = new Set();
        for (const item of batch) {
          const sKey = `${item.dept_id}_${item.session_id}`;
          if (!notifiedSessions.has(sKey)) {
            notifiedSessions.add(sKey);
            if (item.io) {
              item.io.emit("NEW_FEEDBACK_RECEIVED", { dept_id: item.dept_id, session_id: item.session_id });
            }
          }
        }

        // Asynchronous AI Vector Embeddings (fire & forget, non-blocking)
        this.processEmbeddingsAsync(allFacultyRemarks, allSectionRemarks, allDeptRemarks);

      } catch (innerErr) {
        await trx.rollback();
        throw innerErr;
      }

    } catch (batchErr) {
      console.error(`❌ [SubmissionQueue Batch Error] Failed to persist ${count} items:`, batchErr.message);
    } finally {
      this.isFlushing = false;
      // If items accumulated while flushing, schedule immediate flush
      if (this.queue.length > 0) {
        setTimeout(() => this.flush().catch(() => {}), 50);
      }
    }

    return count;
  }

  processEmbeddingsAsync(facultyRemarks, sectionRemarks, deptRemarks) {
    setTimeout(async () => {
      try {
        const { generateEmbedding } = require('../utils/embedder');
        for (const r of facultyRemarks) {
          const vector = await generateEmbedding(r.remark_text);
          if (vector) {
            await db('global_faculty_remarks')
              .where({ session_id: r.session_id, faculty_id: r.faculty_id, course_id: r.course_id, remark_text: r.remark_text })
              .update({ embedding: JSON.stringify(vector) })
              .catch(() => {});
          }
        }
        for (const r of sectionRemarks) {
          const vector = await generateEmbedding(r.remark_text);
          if (vector) {
            await db('global_section_remarks')
              .where({ session_id: r.session_id, faculty_id: r.faculty_id, course_id: r.course_id, section_heading: r.section_heading, remark_text: r.remark_text })
              .update({ embedding: JSON.stringify(vector) })
              .catch(() => {});
          }
        }
        for (const r of deptRemarks) {
          const vector = await generateEmbedding(r.remark_text);
          if (vector) {
            await db('global_session_remarks')
              .where({ session_id: r.session_id, dept_id: r.dept_id, remark_text: r.remark_text })
              .update({ embedding: JSON.stringify(vector) })
              .catch(() => {});
          }
        }
      } catch (embErr) {
        // Embeddings are non-critical enhancements; failure does not impact feedback data
        console.warn("[SubmissionQueue Embeddings Warning]:", embErr.message);
      }
    }, 100);
  }
}

const submissionQueue = new SubmissionQueue();

module.exports = submissionQueue;
module.exports.SubmissionQueue = SubmissionQueue;
