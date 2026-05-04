"use client";

type PerformanceLike = {
  mark?: (...args: unknown[]) => void;
  measure?: (...args: unknown[]) => void;
  clearMarks?: (...args: unknown[]) => void;
  clearMeasures?: (...args: unknown[]) => void;
  getEntriesByName?: (...args: unknown[]) => unknown[];
};

export function ensurePerformanceMarkApi() {
  if (typeof globalThis === "undefined") {
    return;
  }

  const target = globalThis as typeof globalThis & { performance?: PerformanceLike };
  const perf = (target.performance ?? {}) as PerformanceLike;

  if (typeof perf.mark !== "function") {
    perf.mark = () => {};
  }

  if (typeof perf.measure !== "function") {
    perf.measure = () => {};
  }

  if (typeof perf.clearMarks !== "function") {
    perf.clearMarks = () => {};
  }

  if (typeof perf.clearMeasures !== "function") {
    perf.clearMeasures = () => {};
  }

  if (typeof perf.getEntriesByName !== "function") {
    perf.getEntriesByName = () => [];
  }

  if (!target.performance) {
    (target as { performance: unknown }).performance = perf;
  }
}
