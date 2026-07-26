import { describe, expect, it } from "vitest";
import { analytics, buildChartPoints } from "./analytics";

describe("analytics", () => {
  it("computes metrics from API-style readings that use valueMgDl", () => {
    const readings = [
      { id: "1", valueMgDl: 100, recordedAt: "2026-07-26T07:15:00", context: "FASTING", source: "MANUAL", verifiedAt: "2026-07-26T07:15:00" },
      { id: "2", valueMgDl: 160, recordedAt: "2026-07-26T09:20:00", context: "AFTER_MEAL", source: "MANUAL", verifiedAt: "2026-07-26T09:20:00" },
      { id: "3", valueMgDl: 200, recordedAt: "2026-07-26T13:10:00", context: "BEFORE_MEAL", source: "DEVICE_IMPORT", verifiedAt: "2026-07-26T13:10:00" },
    ] as const;

    const stats = analytics(readings as unknown as Parameters<typeof analytics>[0]);

    expect(stats.average).toBe(153);
    expect(stats.highEvents).toBe(1);
    expect(stats.lowEvents).toBe(0);
    expect(stats.tir).toBe(67);
  });

  it("builds a chart path from real readings", () => {
    const readings = [
      { id: "1", value: 90, recordedAt: "2026-07-26T07:15:00", context: "FASTING" as const, source: "MANUAL" as const, verified: true },
      { id: "2", value: 130, recordedAt: "2026-07-26T09:20:00", context: "AFTER_MEAL" as const, source: "MANUAL" as const, verified: true },
      { id: "3", value: 160, recordedAt: "2026-07-26T13:10:00", context: "BEFORE_MEAL" as const, source: "DEVICE_IMPORT" as const, verified: true },
    ];

    const points = buildChartPoints(readings);

    expect(points).toContain("0.0,136.0");
    expect(points).toContain("300.0,102.0");
    expect(points).toContain("600.0,76.5");
  });
});
