import { metricsCollector } from "./metricsCollector";
import type { GlobalMetrics, ProcedureMetric, QueryMetric } from "./metricsCollector";

export interface MetricsReport {
  capturedAt: string;
  duration: string;
  totalRequests: number;
  totalTime: number;
  averageResponseTime: number;
  cacheHitRate: string;
  procedures: {
    name: string;
    calls: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    dataSize: number;
    cacheHitRate: string;
    recommendation: string;
  }[];
  queries: {
    operation: string;
    calls: number;
    avgTime: number;
    calledFrom: string[];
  }[];
  analysis: {
    slowestProcedures: string[];
    mostFrequentProcedures: string[];
    nplusOneDetected: string[];
    cachingOpportunities: string[];
  };
}

export function exportMetricsAsJSON(): MetricsReport {
  const metrics = metricsCollector.getMetrics();

  const procedures = Array.from(metrics.procedures.values())
    .sort((a, b) => b.callCount - a.callCount)
    .map((p) => ({
      name: p.name,
      calls: p.callCount,
      avgTime: Math.round(p.avgTime),
      minTime: Math.round(p.minTime),
      maxTime: Math.round(p.maxTime),
      dataSize: Math.round(p.dataSize),
      cacheHitRate: `${(p.cacheHitRate * 100).toFixed(1)}%`,
      recommendation: getRecommendation(p),
    }));

  const queries = Array.from(metrics.queries.values())
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, 20)
    .map((q) => ({
      operation: q.operation,
      calls: q.callCount,
      avgTime: Math.round(q.avgTime),
      calledFrom: q.calledFrom,
    }));

  const slowestProcedures = metrics.slowProcedures
    .slice(0, 10)
    .map((p) => `${p.name}: ${Math.round(p.avgTime)}ms (${p.callCount} calls)`);

  const mostFrequentProcedures = Array.from(metrics.procedures.values())
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 10)
    .map((p) => `${p.name}: ${p.callCount} calls`);

  const cachingOpportunities = Array.from(metrics.procedures.values())
    .filter((p) => p.callCount > 5 && p.avgTime > 100)
    .sort((a, b) => b.callCount * b.avgTime - a.callCount * a.avgTime)
    .slice(0, 10)
    .map(
      (p) =>
        `${p.name}: ROI=${Math.round(
          (p.callCount * p.avgTime) / p.dataSize
        )}, hit_rate=${(p.cacheHitRate * 100).toFixed(1)}%`
    );

  return {
    capturedAt: metrics.capturedAt.toISOString(),
    duration: "Since app start",
    totalRequests: metrics.totalRequests,
    totalTime: Math.round(metrics.totalTime),
    averageResponseTime: Math.round(metrics.averageResponseTime),
    cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
    procedures,
    queries,
    analysis: {
      slowestProcedures,
      mostFrequentProcedures,
      nplusOneDetected: metrics.nplusOneDetected,
      cachingOpportunities,
    },
  };
}

function getRecommendation(p: ProcedureMetric): string {
  const roi = (p.callCount * p.avgTime) / Math.max(p.dataSize, 1);

  if (p.callCount < 5) return "LOW_PRIORITY";
  if (p.cacheHitRate > 0.7) return "ALREADY_CACHED";
  if (roi > 100 && p.avgTime > 300) return "HIGH_PRIORITY_CACHE";
  if (roi > 50 && p.avgTime > 200) return "MEDIUM_PRIORITY_CACHE";
  if (p.avgTime > 1000) return "NEEDS_OPTIMIZATION";
  return "MONITOR";
}

export function getMetricsHTML(): string {
  const report = exportMetricsAsJSON();

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Klassi Performance Metrics</title>
  <style>
    body { font-family: monospace; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .summary { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
    table { border-collapse: collapse; width: 100%; background: white; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #4CAF50; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .high { color: #d32f2f; font-weight: bold; }
    .medium { color: #f57c00; }
    .low { color: #388e3c; }
  </style>
</head>
<body>
  <h1>📊 Klassi Performance Metrics Report</h1>

  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Captured:</strong> ${report.capturedAt}</p>
    <p><strong>Total Requests:</strong> ${report.totalRequests}</p>
    <p><strong>Total Time:</strong> ${report.totalTime}ms</p>
    <p><strong>Average Response Time:</strong> <span class="${getClass(report.averageResponseTime)}">${report.averageResponseTime}ms</span></p>
    <p><strong>Cache Hit Rate:</strong> ${report.cacheHitRate}</p>
  </div>

  <div class="summary">
    <h2>🔴 Slowest Procedures</h2>
    <ul>${report.analysis.slowestProcedures.map((p) => `<li>${p}</li>`).join("")}</ul>
  </div>

  <div class="summary">
    <h2>📈 Most Frequent Procedures</h2>
    <ul>${report.analysis.mostFrequentProcedures.map((p) => `<li>${p}</li>`).join("")}</ul>
  </div>

  <div class="summary">
    <h2>💾 Caching Opportunities (by ROI)</h2>
    <ul>${report.analysis.cachingOpportunities.map((p) => `<li>${p}</li>`).join("")}</ul>
  </div>

  ${
    report.analysis.nplusOneDetected.length > 0
      ? `
    <div class="summary" style="border: 2px solid #d32f2f;">
      <h2 style="color: #d32f2f;">⚠️ N+1 Query Patterns Detected</h2>
      <ul>${report.analysis.nplusOneDetected.map((p) => `<li>${p}</li>`).join("")}</ul>
    </div>
  `
      : ""
  }

  <div class="summary">
    <h2>All Procedures</h2>
    <table>
      <thead>
        <tr>
          <th>Procedure</th>
          <th>Calls</th>
          <th>Avg Time</th>
          <th>Min/Max</th>
          <th>Data Size</th>
          <th>Cache Hit %</th>
          <th>Recommendation</th>
        </tr>
      </thead>
      <tbody>
        ${report.procedures
          .map(
            (p) => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.calls}</td>
            <td class="${getClass(p.avgTime)}">${p.avgTime}ms</td>
            <td>${p.minTime}/${p.maxTime}ms</td>
            <td>${formatBytes(p.dataSize)}</td>
            <td>${p.cacheHitRate}</td>
            <td><code>${p.recommendation}</code></td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="summary">
    <h2>Top Queries by Time</h2>
    <table>
      <thead>
        <tr>
          <th>Operation</th>
          <th>Calls</th>
          <th>Avg Time</th>
          <th>Called From</th>
        </tr>
      </thead>
      <tbody>
        ${report.queries
          .map(
            (q) => `
          <tr>
            <td><code>${q.operation}</code></td>
            <td>${q.calls}</td>
            <td class="${getClass(q.avgTime)}">${q.avgTime}ms</td>
            <td>${q.calledFrom.join(", ")}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;
}

function getClass(time: number): string {
  if (time > 500) return "high";
  if (time > 200) return "medium";
  return "low";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
