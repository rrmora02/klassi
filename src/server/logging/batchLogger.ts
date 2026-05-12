import { db } from "@/server/db";

type BatchEntry =
  | { type: "audit"; data: any }
  | { type: "error"; data: any }
  | { type: "business"; data: any };

export class BatchLoggingQueue {
  private queue: BatchEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly MAX_BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private isProcessing = false;

  async enqueue(entry: BatchEntry): Promise<void> {
    this.queue.push(entry);

    // Auto-flush when batch reaches max size
    if (this.queue.length >= this.MAX_BATCH_SIZE) {
      await this.flush();
    }
    // Schedule flush if not already scheduled
    else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    let batch: BatchEntry[] = [];

    try {
      batch = this.queue.splice(0);
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      const auditLogs = batch.filter((e) => e.type === "audit").map((e) => e.data);
      const errorLogs = batch.filter((e) => e.type === "error").map((e) => e.data);
      const businessEvents = batch.filter((e) => e.type === "business").map((e) => e.data);

      // Execute all batch operations in parallel
      await Promise.all([
        auditLogs.length > 0 && this.flushAuditBatch(auditLogs),
        errorLogs.length > 0 && this.flushErrorBatch(errorLogs),
        businessEvents.length > 0 && this.flushBusinessEventBatch(businessEvents),
      ]);

      console.log(
        `[BATCH LOG] Flushed ${batch.length} logs (${auditLogs.length} audit, ${errorLogs.length} error, ${businessEvents.length} business)`
      );
    } catch (error) {
      console.error("[BATCH LOG ERROR] Failed to flush batch:", error);
      // Re-add items back to queue on error (will retry on next flush)
      this.queue.unshift(
        ...batch.map((e) => ({ type: e.type, data: e.data } as BatchEntry))
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async flushAuditBatch(data: any[]): Promise<void> {
    if (data.length === 0) return;
    await (db.auditLog.createMany as any)({ data });
  }

  private async flushErrorBatch(data: any[]): Promise<void> {
    if (data.length === 0) return;
    await (db.errorLog.createMany as any)({ data });
  }

  private async flushBusinessEventBatch(data: any[]): Promise<void> {
    if (data.length === 0) return;
    await (db.businessEvent.createMany as any)({ data });
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getStats(): { queueSize: number; maxBatchSize: number; flushInterval: number } {
    return {
      queueSize: this.queue.length,
      maxBatchSize: this.MAX_BATCH_SIZE,
      flushInterval: this.FLUSH_INTERVAL,
    };
  }

  // Call on app shutdown to ensure all logs are persisted
  async flushAll(): Promise<void> {
    console.log("[BATCH LOG] Flushing all remaining logs...");
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}

// Singleton instance
export const batchLoggingQueue = new BatchLoggingQueue();

// Ensure logs are flushed on process exit
process.on("exit", () => {
  batchLoggingQueue.flushAll().catch((err) => {
    console.error("[BATCH LOG] Failed to flush on exit:", err);
  });
});

process.on("SIGINT", async () => {
  console.log("[BATCH LOG] SIGINT received, flushing logs...");
  await batchLoggingQueue.flushAll();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[BATCH LOG] SIGTERM received, flushing logs...");
  await batchLoggingQueue.flushAll();
  process.exit(0);
});
