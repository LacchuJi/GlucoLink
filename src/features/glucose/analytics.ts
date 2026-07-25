import type { GlucoseReading } from "./types";

const inRange = (v: number) => v >= 70 && v <= 180;
export function analytics(readings: GlucoseReading[]) {
  if (!readings.length) return { average: 0, highEvents: 0, lowEvents: 0, tir: 0, a1c: "—", cv: 0 };
  const values = readings.map((r) => r.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  return { average: Math.round(avg), highEvents: values.filter((v) => v > 180).length, lowEvents: values.filter((v) => v < 70).length, tir: Math.round(values.filter(inRange).length / values.length * 100), a1c: ((avg + 46.7) / 28.7).toFixed(1), cv: Math.round(sd / avg * 100) };
}

/** Never use this as a diagnosis. It is a UI trend classifier only. */
export function trend(readings: GlucoseReading[]) {
  if (readings.length < 2) return "steady";
  const delta = readings.at(-1)!.value - readings.at(-2)!.value;
  return delta > 15 ? "rising" : delta < -15 ? "falling" : "steady";
}
