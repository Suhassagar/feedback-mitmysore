const db = require('../config/db');

const getDepartmentAnalytics = async (req, res) => {
  const { dept_id } = req.params;
  try {
    const avgResult = await db('global_student_feedback')
      .where('dept_id', dept_id)
      .andWhere('is_genuine', true)
      .avg('rating as avg_rating')
      .first();

    const completedResult = await db('global_students')
      .where({ dept_id, feedback_given: 'done' })
      .count('* as completed_feedbacks')
      .first();

    const totalResult = await db('global_students')
      .where({ dept_id })
      .count('* as total_students')
      .first();

    const trendRows = await db('global_student_feedback as sf')
      .join('global_sessions as s', function() {
        this.on('sf.session_id', '=', 's.session_id').andOn('sf.dept_id', '=', 's.dept_id');
      })
      .where('sf.dept_id', dept_id)
      .andWhere('sf.is_genuine', true)
      .andWhere('sf.created_at', '>=', db.raw('DATE_SUB(CURDATE(), INTERVAL 6 DAY)'))
      .select(
        db.raw("DATE_FORMAT(sf.created_at, '%a') as name"),
        db.raw("COUNT(DISTINCT sf.created_at) as submissions")
      )
      .groupByRaw("DATE(sf.created_at), DATE_FORMAT(sf.created_at, '%a')")
      .orderByRaw('DATE(sf.created_at) ASC');

    res.json({
      avgRating: avgResult.avg_rating ? parseFloat(avgResult.avg_rating).toFixed(2) : "0.00",
      totalSubmitted: completedResult.completed_feedbacks || 0,
      totalStudents: totalResult.total_students || 0,
      trendData: trendRows
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

const getFacultyAnalytics = async (req, res) => {
  const { faculty_id } = req.params;
  const { course_id, sem, section } = req.query;
  const { role, faculty_id: session_faculty_id, dept_id: session_dept_id } = req.session || {};

  if (!faculty_id || typeof faculty_id !== 'string') {
    return res.status(400).json({ error: "Invalid faculty ID" });
  }

  const cleanFacultyId = faculty_id.trim();

  // BOLA Defense: Faculty can strictly ONLY access their own evaluation analytics
  if (role === 'faculty') {
    if (!session_faculty_id || session_faculty_id.toLowerCase() !== cleanFacultyId.toLowerCase()) {
      return res.status(403).json({ 
        error: "Forbidden: You are strictly authorized to view your own performance analytics only." 
      });
    }
  }

  try {
    // 0. Auto-resolve Faculty Record & Department
    const facultyRecord = await db('global_faculty')
      .whereRaw('LOWER(faculty_id) = ?', [cleanFacultyId.toLowerCase()])
      .first();

    if (!facultyRecord) {
      return res.status(404).json({ error: `Faculty member '${cleanFacultyId}' not found` });
    }

    // BOLA Defense: Department HODs can strictly ONLY view analytics for faculty in their own department
    if (role === 'department') {
      if (!session_dept_id || session_dept_id.toUpperCase() !== (facultyRecord.dept_id || '').toUpperCase()) {
        return res.status(403).json({ 
          error: "Forbidden: Cross-department faculty performance access is strictly prohibited." 
        });
      }
    }

    const effectiveDeptId = (role === 'department' ? session_dept_id : (facultyRecord.dept_id || '')).trim();

    let filterClause = {};
    if (course_id && sem && section) {
      filterClause = {
        'sf.course_id': course_id,
        's.sem': sem,
        's.section': section
      };
    }

    // 0b. Faculty Profile
    const profile = await db('global_faculty as f')
      .leftJoin('department as d', db.raw('UPPER(f.dept_id) = UPPER(d.dept_id)'))
      .whereRaw('LOWER(f.faculty_id) = ?', [cleanFacultyId.toLowerCase()])
      .select('f.faculty_id', 'f.name', 'f.email', 'f.position as designation', 'd.dept_name', 'f.dept_id', 'f.joining_date', 'f.dob', 'f.profile_picture_url')
      .first();

    // 1. Overall Stats
    let statsQuery = db('global_faculty_scorecards as sc')
      .leftJoin('global_sessions as s', function() {
        this.on('sc.session_id', '=', 's.session_id').andOn(db.raw('UPPER(sc.dept_id) = UPPER(s.dept_id)'));
      })
      .whereRaw('LOWER(sc.faculty_id) = ?', [cleanFacultyId.toLowerCase()])
      .select(
        db.raw('ROUND(COALESCE(SUM(sc.total_score_sum) / NULLIF(SUM(sc.ratings_count), 0), 0), 2) as avg_rating'),
        db.raw('COALESCE(SUM(sc.ratings_count), 0) as total_feedback')
      );
      
    if (effectiveDeptId) {
      statsQuery = statsQuery.andWhereRaw('UPPER(sc.dept_id) = UPPER(?)', [effectiveDeptId]);
    }
    if (course_id && sem && section) {
      statsQuery = statsQuery.andWhere({ 'sc.course_id': course_id, 's.sem': sem, 's.section': section });
    }
    const stats = await statsQuery.first();

    // 2. Rating Distribution
    let distQuery = db('global_faculty_scorecards as sc')
      .leftJoin('global_sessions as s', function() {
        this.on('sc.session_id', '=', 's.session_id').andOn(db.raw('UPPER(sc.dept_id) = UPPER(s.dept_id)'));
      })
      .whereRaw('LOWER(sc.faculty_id) = ?', [cleanFacultyId.toLowerCase()])
      .select(
        db.raw('COALESCE(SUM(sc.excellent_count), 0) as excellent'),
        db.raw('COALESCE(SUM(sc.good_count), 0) as good'),
        db.raw('COALESCE(SUM(sc.average_count), 0) as average'),
        db.raw('COALESCE(SUM(sc.poor_count), 0) as poor')
      );
      
    if (effectiveDeptId) {
      distQuery = distQuery.andWhereRaw('UPPER(sc.dept_id) = UPPER(?)', [effectiveDeptId]);
    }
    if (course_id && sem && section) {
      distQuery = distQuery.andWhere({ 'sc.course_id': course_id, 's.sem': sem, 's.section': section });
    }
    const distribution = await distQuery.first();

    // 3. Trend Data
    let trendQuery = db('global_faculty_scorecards as sc')
      .join('global_sessions as s', function() {
        this.on('sc.session_id', '=', 's.session_id').andOn(db.raw('UPPER(sc.dept_id) = UPPER(s.dept_id)'));
      })
      .whereRaw('LOWER(sc.faculty_id) = ?', [cleanFacultyId.toLowerCase()])
      .select('s.sem', db.raw('ROUND(COALESCE(SUM(sc.total_score_sum) / NULLIF(SUM(sc.ratings_count), 0), 0), 2) as avg_rating'))
      .groupBy('s.sem')
      .orderBy('s.sem', 'asc');
      
    if (effectiveDeptId) {
      trendQuery = trendQuery.andWhereRaw('UPPER(sc.dept_id) = UPPER(?)', [effectiveDeptId]);
    }
    if (course_id && sem && section) {
      trendQuery = trendQuery.andWhere({ 'sc.course_id': course_id, 's.sem': sem, 's.section': section });
    }
    const trendData = await trendQuery;

    // 4. Question-level breakdown (Composite key join on question_id + dept_id)
    let radarQuery = db('global_student_feedback as sf')
      .join('global_feedback_questions as q', function() {
        this.on('sf.question_id', '=', 'q.question_id').andOn(db.raw('UPPER(sf.dept_id) = UPPER(q.dept_id)'));
      })
      .leftJoin('global_sessions as s', function() {
        this.on('sf.session_id', '=', 's.session_id').andOn(db.raw('UPPER(sf.dept_id) = UPPER(s.dept_id)'));
      })
      .whereRaw('LOWER(sf.faculty_id) = ? AND sf.is_genuine = 1', [cleanFacultyId.toLowerCase()])
      .andWhere(filterClause)
      .select('q.question_text as question', db.raw('ROUND(COALESCE(AVG(sf.rating), 0), 2) as avg_rating'))
      .groupBy('sf.question_id', 'q.question_text');

    if (effectiveDeptId) {
      radarQuery = radarQuery.andWhereRaw('UPPER(sf.dept_id) = UPPER(?)', [effectiveDeptId]);
    }
    const radarData = await radarQuery;

    // 5. Subject-level breakdown (Includes section filterClause)
    let subjectQuery = db('global_faculty_scorecards as sc')
      .join('global_course as c', function() {
        this.on('sc.course_id', '=', 'c.course_code').andOn(db.raw('UPPER(sc.dept_id) = UPPER(c.dept_id)'));
      })
      .leftJoin('global_sessions as s', function() {
        this.on('sc.session_id', '=', 's.session_id').andOn(db.raw('UPPER(sc.dept_id) = UPPER(s.dept_id)'));
      })
      .whereRaw('LOWER(sc.faculty_id) = ?', [cleanFacultyId.toLowerCase()])
      .select('c.course_name', 'c.course_code', db.raw('ROUND(COALESCE(SUM(sc.total_score_sum) / NULLIF(SUM(sc.ratings_count), 0), 0), 2) as avg_rating'))
      .groupBy('sc.course_id', 'c.course_name', 'c.course_code');
      
    if (effectiveDeptId) {
      subjectQuery = subjectQuery.andWhereRaw('UPPER(sc.dept_id) = UPPER(?)', [effectiveDeptId]);
    }
    if (course_id && sem && section) {
      subjectQuery = subjectQuery.andWhere({ 'sc.course_id': course_id, 's.sem': sem, 's.section': section });
    }
    const subjectData = await subjectQuery;

    // 6. Assigned Subjects & Student Participation
    let assignQuery = db('global_assign as a')
      .join('global_course as c', function() {
        this.on('a.course_code', '=', 'c.course_code').andOn(db.raw('UPPER(a.dept_id) = UPPER(c.dept_id)'));
      })
      .whereRaw('LOWER(a.faculty_id) = ?', [cleanFacultyId.toLowerCase()])
      .select(
        'a.course_code', 'c.course_name', 'a.sem', 'a.section',
        db.raw(`(SELECT COUNT(*) FROM global_students s WHERE s.sem = a.sem AND s.section = a.section AND s.session_id IS NOT NULL AND UPPER(s.dept_id) = UPPER(?)) as total_students`, [effectiveDeptId || '']),
        db.raw(`(SELECT COUNT(*) FROM global_students s WHERE s.sem = a.sem AND s.section = a.section AND s.feedback_given = 'done' AND s.session_id IS NOT NULL AND UPPER(s.dept_id) = UPPER(?)) as completed_students`, [effectiveDeptId || ''])
      );

    if (effectiveDeptId) {
      assignQuery = assignQuery.andWhereRaw('UPPER(a.dept_id) = UPPER(?)', [effectiveDeptId]);
    }
    const assignedSubjects = await assignQuery;

    // Active sessions
    let activeSessionsQuery = db('global_assign as a')
      .join('global_sessions as s', function() {
        this.on('a.sem', '=', 's.sem').andOn('a.section', '=', 's.section').andOn(db.raw('UPPER(a.dept_id) = UPPER(s.dept_id)'));
      })
      .whereRaw('LOWER(a.faculty_id) = ? AND s.status = ?', [cleanFacultyId.toLowerCase(), 'active'])
      .select(db.raw('COUNT(DISTINCT a.sem, a.section) as active_sessions'));

    if (effectiveDeptId) {
      activeSessionsQuery = activeSessionsQuery.andWhereRaw('UPPER(a.dept_id) = UPPER(?)', [effectiveDeptId]);
    }
    const activeSessions = await activeSessionsQuery.first();

    res.json({
      profile: profile || { 
        name: facultyRecord?.name || 'Faculty Member', 
        email: facultyRecord?.email || 'N/A', 
        dept_name: effectiveDeptId || 'Department', 
        faculty_id: facultyRecord?.faculty_id || cleanFacultyId,
        designation: facultyRecord?.position || 'Faculty'
      },
      avgRating: stats?.avg_rating ? parseFloat(stats.avg_rating).toFixed(2) : "0.00",
      totalFeedback: stats?.total_feedback || 0,
      distribution: {
        excellent: parseInt(distribution?.excellent, 10) || 0,
        good: parseInt(distribution?.good, 10) || 0,
        average: parseInt(distribution?.average, 10) || 0,
        poor: parseInt(distribution?.poor, 10) || 0
      },
      trendData: trendData || [],
      radarData: radarData || [],
      subjectData: subjectData || [],
      assignedSubjects: assignedSubjects || [],
      activeSessionsCount: activeSessions?.active_sessions || 0
    });

  } catch (err) {
    console.error("Faculty Analytics Error:", err);
    res.status(500).json({ error: "Error fetching faculty analytics" });
  }
};

const getTopFaculties = async (req, res) => {
  try {
    const dept_id = req.session.dept_id;
    let query = db('global_faculty as f')
      .join('global_assign as fc', function() {
        this.on('f.faculty_id', '=', 'fc.faculty_id').andOn('f.dept_id', '=', 'fc.dept_id');
      })
      .join('global_course as c', function() {
        this.on('fc.course_code', '=', 'c.course_code').andOn('fc.dept_id', '=', 'c.dept_id');
      })
      .join('global_student_feedback as fr', function() {
        this.on('fr.faculty_id', '=', 'f.faculty_id')
          .andOn('fr.course_id', '=', 'c.course_code')
          .andOn('fr.dept_id', '=', 'f.dept_id')
          .andOn('fr.is_genuine', '=', 1);
      })
      .join('global_sessions as s', function() {
        this.on('fr.session_id', '=', 's.session_id').andOn('fr.dept_id', '=', 's.dept_id');
      })
      .select(
        'f.faculty_id', 'f.name', 'f.email', 'f.dept_id as dept_name',
        'c.course_name', 'c.course_code', 's.sem', 's.section',
        db.raw('ROUND(COALESCE(AVG(fr.rating), 0), 2) AS avg_rating')
      )
      .groupBy('f.faculty_id', 'f.name', 'f.email', 'f.dept_id', 'c.course_name', 'c.course_code', 's.sem', 's.section')
      .orderBy('avg_rating', 'desc');

    if (dept_id) {
      query = query.where('f.dept_id', dept_id);
    }

    const rows = await query;

    // Get top 1 faculty per department (or section/course if scoped)
    const seenDept = new Set();
    const top = [];

    for (const r of rows) {
      if (!seenDept.has(r.dept_name)) {
        top.push(r);
        seenDept.add(r.dept_name);
      }
      if (top.length === 2) break; // keep the logic
    }

    return res.json(top);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching top faculties" });
  }
};

const getStudentRoster = async (req, res) => {
  const { dept_id, sem, section } = req.params;
  const { role, faculty_id, dept_id: session_dept_id } = req.session || {};
  
  try {
    // If faculty, verify they belong to this department and teach this semester/section
    if (role === 'faculty') {
      if (session_dept_id && session_dept_id.toUpperCase() !== dept_id.toUpperCase()) {
        return res.status(403).json({ error: "Forbidden: Cannot access student rosters outside your department" });
      }

      const assignment = await db('global_assign')
        .where({
          faculty_id,
          dept_id,
          sem,
          section
        })
        .first();

      if (!assignment) {
        return res.status(403).json({ error: "Forbidden: You are only permitted to view student rosters for classes you teach" });
      }
    } else if (role === 'department') {
      if (session_dept_id && session_dept_id.toUpperCase() !== dept_id.toUpperCase()) {
        return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
      }
    } else if (role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Unauthorized access" });
    }

    const students = await db('global_students')
      .where({ dept_id, sem, section })
      .select('usn', 'name', 'feedback_given', 'session_id')
      .orderBy('usn', 'asc');
      
    res.json(students);
  } catch (err) {
    console.error("Error fetching student roster:", err);
    res.status(500).json({ error: "Failed to fetch student roster" });
  }
};

module.exports = {
  getDepartmentAnalytics,
  getFacultyAnalytics,
  getTopFaculties,
  getStudentRoster
};
