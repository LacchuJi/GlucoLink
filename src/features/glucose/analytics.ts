import type { GlucoseReading } from "./types";

type ReadingLike = Partial<GlucoseReading> & { value?: number; valueMgDl?: number };

const inRange = (v: number) => v >= 70 && v <= 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function toValues(readings: ReadingLike[]) {
  return readings.map((reading) => reading.value ?? reading.valueMgDl ?? 0);
}

export function analytics(readings: ReadingLike[]) {
  if (!readings.length) return { average: 0, highEvents: 0, lowEvents: 0, tir: 0, a1c: "—", cv: 0 };

  const values = toValues(readings);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);

  return {
    average: Math.round(avg),
    highEvents: values.filter((v) => v > 180).length,
    lowEvents: values.filter((v) => v < 70).length,
    tir: Math.round((values.filter(inRange).length / values.length) * 100),
    a1c: ((avg + 46.7) / 28.7).toFixed(1),
    cv: Math.round((sd / avg) * 100),
  };
}

export function buildChartPoints(readings: ReadingLike[]) {
  if (!readings.length) return "";

  const values = toValues(readings);
  const width = 600;
  const height = 170;
  const minValue = 50;
  const maxValue = 250;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((clamp(value, minValue, maxValue) - minValue) / (maxValue - minValue)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Never use this as a diagnosis. It is a UI trend classifier only. */
export function trend(readings: ReadingLike[]) {
  if (readings.length < 2) return "steady";
  const delta = (readings.at(-1)?.value ?? readings.at(-1)?.valueMgDl ?? 0) - (readings.at(-2)?.value ?? readings.at(-2)?.valueMgDl ?? 0);
  return delta > 15 ? "rising" : delta < -15 ? "falling" : "steady";
}
