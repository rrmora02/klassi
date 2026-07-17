export interface ProcedureMetric {
  name: string;
  callCount: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  p95Time: number;
  dataSize: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
}

export interface QueryMetric {
  operation: string; // e.g., "user.findUnique"
  table: string;
  callCount: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  calledFrom: string[];
  isNPlusOne?: boolean;
}

export interface GlobalMetrics {
  capturedAt: Date;
  totalRequests: number;
  totalTime: number;
  averageResponseTime: number;
  cacheHitRate: number;
  procedures: Map<string, ProcedureMetric>;
  queries: Map<string, QueryMetric>;
  nplusOneDetected: string[];
  slowProcedures: ProcedureMetric[];
}

export class MetricsCollector {
  private procedures: Map<string, ProcedureMetric> = new Map();
  private queries: Map<string, QueryMetric> = new Map();
  private nplusOnePatterns: Set<string> = new Set();
  private capturedAt: Date = new Date();
  private totalTime: number = 0;
  private totalRequests: number = 0;

  recordProcedure(
    name: string,
    duration: number,
    dataSize: number,
    cacheHit: boolean
  ): void {
    const metric = this.procedures.get(name) || {
      name,
      callCount: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      avgTime: 0,
      p95Time: 0,
      dataSize: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
    };

    metric.callCount++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.callCount;
    metric.dataSize = Math.max(metric.dataSize, dataSize);

    if (cacheHit) {
      metric.cacheHits++;
    } else {
      metric.cacheMisses++;
    }

    metric.cacheHitRate = metric.cacheHits / (metric.cacheHits + metric.cacheMisses);

    this.procedures.set(name, metric);
    this.totalTime += duration;
    this.totalRequests++;
  }

  recordQuery(
    operation: string,
    table: string,
    duration: number,
    calledFrom: string
  ): void {
    const key = `${operation}:${table}`;
    const query = this.queries.get(key) || {
      operation,
      table,
      callCount: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      avgTime: 0,
      calledFrom: [],
    };

    query.callCount++;
    query.totalTime += duration;
    query.minTime = Math.min(query.minTime, duration);
    query.maxTime = Math.max(query.maxTime, duration);
    query.avgTime = query.totalTime / query.callCount;

    if (!query.calledFrom.includes(calledFrom)) {
      query.calledFrom.push(calledFrom);
    }

    this.queries.set(key, query);
  }

  detectNPlusOne(): void {
    for (const [, procedure] of this.procedures) {
      const avgQueriesPerCall = this.getAverageQueriesPerProcedure(procedure.name);
      if (avgQueriesPerCall > 5) {
        this.nplusOnePatterns.add(
          `${procedure.name} makes ~${Math.round(avgQueriesPerCall)} queries per call (potential N+1)`
        );
      }
    }
  }

  private getAverageQueriesPerProcedure(procedureName: string): number {
    const procedureQueries = Array.from(this.queries.values()).filter((q) =>
      q.calledFrom.includes(procedureName)
    );

    if (procedureQueries.length === 0) return 0;

    const totalQueries = procedureQueries.reduce((sum, q) => sum + q.callCount, 0);
    const procedure = this.procedures.get(procedureName);
    if (!procedure) return 0;

    return totalQueries / procedure.callCount;
  }

  getMetrics(): GlobalMetrics {
    const slowProcedures = Array.from(this.procedures.values())
      .filter((p) => p.avgTime > 500)
      .sort((a, b) => b.avgTime - a.avgTime);

    const totalCacheHits = Array.from(this.procedures.values()).reduce(
      (sum, p) => sum + p.cacheHits,
      0
    );
    const totalCacheMisses = Array.from(this.procedures.values()).reduce(
      (sum, p) => sum + p.cacheMisses,
      0
    );
    const cacheHitRate =
      totalCacheHits / (totalCacheHits + totalCacheMisses) || 0;

    this.detectNPlusOne();

    return {
      capturedAt: this.capturedAt,
      totalRequests: this.totalRequests,
      totalTime: this.totalTime,
      averageResponseTime: this.totalTime / this.totalRequests || 0,
      cacheHitRate,
      procedures: this.procedures,
      queries: this.queries,
      nplusOneDetected: Array.from(this.nplusOnePatterns),
      slowProcedures,
    };
  }

  reset(): void {
    this.procedures.clear();
    this.queries.clear();
    this.nplusOnePatterns.clear();
    this.capturedAt = new Date();
    this.totalTime = 0;
    this.totalRequests = 0;
  }

  getSize(): number {
    return this.procedures.size + this.queries.size;
  }
}

export const metricsCollector = new MetricsCollector();
