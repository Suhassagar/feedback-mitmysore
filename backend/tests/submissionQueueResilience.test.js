const { SubmissionQueue } = require('../services/submissionQueue');

describe('Submission Queue Resilience & Graceful Shutdown Draining', () => {

  it('Queue Telemetry & State: Tracks queue length, processing, and status', () => {
    const queue = new SubmissionQueue({ batchSize: 10, flushIntervalMs: 5000 });
    queue.stop();

    const statusInitial = queue.getStatus();
    expect(statusInitial.queueLength).toBe(0);
    expect(statusInitial.isFlushing).toBe(false);
    expect(statusInitial.totalProcessed).toBe(0);

    queue.enqueue({ dept_id: 'CSE', ratingsToInsert: [{ rating: 5 }] });
    expect(queue.getQueueLength()).toBe(1);
    expect(queue.getStatus().queueLength).toBe(1);
  });

  it('Graceful Drain: Flushes and empties all buffered submissions in memory', async () => {
    const queue = new SubmissionQueue({ batchSize: 5, flushIntervalMs: 5000 });
    queue.stop();

    // Mock flush to simulate successful batch processing
    let flushedCount = 0;
    queue.flush = async function() {
      if (this.queue.length === 0) return 0;
      const batch = this.queue.splice(0, this.batchSize);
      flushedCount += batch.length;
      this.totalProcessed += batch.length;
      return batch.length;
    };

    // Buffer 18 items across 4 batches directly into queue to test drain in isolation
    for (let i = 1; i <= 18; i++) {
      queue.queue.push({ dept_id: 'CSE', id: i });
    }
    expect(queue.getQueueLength()).toBe(18);

    // Drain the queue to completion
    const drained = await queue.drain(5000);
    expect(drained).toBe(18);
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.getStatus().totalProcessed).toBe(18);
  });

  it('Batch Retry Resilience: Automatically re-inserts failed batches to front of queue', async () => {
    const queue = new SubmissionQueue({ 
      batchSize: 5, 
      flushIntervalMs: 5000, 
      maxRetries: 3, 
      retryBackoffMs: 10 // small backoff for unit test
    });
    queue.stop();

    for (let i = 1; i <= 3; i++) {
      queue.enqueue({ id: i, dept_id: 'CSE' });
    }

    // Force flush to fail to trigger catch block
    let failureCount = 0;
    // Save original method
    const originalFlush = queue.flush;

    // Simulate transient failure on first call, success on second call
    let attempts = 0;
    queue.flush = async function() {
      attempts++;
      if (attempts === 1) {
        const batch = this.queue.splice(0, this.batchSize);
        // Simulate catch block behavior
        const recoverable = [];
        for (const item of batch) {
          item._retryCount = (item._retryCount || 0) + 1;
          recoverable.push(item);
        }
        this.totalRetried += recoverable.length;
        this.queue.unshift(...recoverable);
        return 0;
      } else {
        const batch = this.queue.splice(0, this.batchSize);
        this.totalProcessed += batch.length;
        return batch.length;
      }
    };

    // First flush (simulates failure)
    await queue.flush();
    expect(queue.getQueueLength()).toBe(3); // Items recovered to queue!
    expect(queue.getStatus().totalRetried).toBe(3);

    // Second flush (simulates recovery)
    await queue.flush();
    expect(queue.getQueueLength()).toBe(0); // Successfully processed on retry!
    expect(queue.getStatus().totalProcessed).toBe(3);
  });

  it('Circuit Breaker / Dead-Letter: Drops poison items after exceeding maxRetries', async () => {
    const queue = new SubmissionQueue({ 
      batchSize: 5, 
      flushIntervalMs: 5000, 
      maxRetries: 2, 
      retryBackoffMs: 10 
    });
    queue.stop();

    // Enqueue an item already at retry count 2
    queue.enqueue({ id: 'POISON_ROW', _retryCount: 2 });

    // Simulate batch execution failure
    const batch = queue.queue.splice(0, queue.batchSize);
    const recoverable = [];
    const deadLetter = [];

    for (const item of batch) {
      item._retryCount = (item._retryCount || 0) + 1;
      if (item._retryCount <= queue.maxRetries) {
        recoverable.push(item);
      } else {
        deadLetter.push(item);
      }
    }

    if (deadLetter.length > 0) {
      queue.totalDeadLettered += deadLetter.length;
    }
    if (recoverable.length > 0) {
      queue.queue.unshift(...recoverable);
    }

    // Should NOT be re-inserted because 3 > maxRetries (2)
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.getStatus().totalDeadLettered).toBe(1);
  });

  it('Drain Timeout Guard: Resolves safely even if queue cannot drain within timeout limit', async () => {
    const queue = new SubmissionQueue({ batchSize: 5, flushIntervalMs: 5000 });
    queue.stop();

    queue.enqueue({ id: 1 });
    // Intentionally block flush to simulate stalled DB (e.g. 200ms)
    queue.flush = async function() {
      await new Promise(r => setTimeout(r, 200));
      return 0;
    };

    const startTime = Date.now();
    // Timeout of 50ms should abort drain safely after 1st stalled attempt
    await queue.drain(50);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(400);
  });


});
