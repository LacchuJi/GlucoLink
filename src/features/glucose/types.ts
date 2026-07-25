export type MealContext = "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL" | "BEDTIME" | "RANDOM";
export type ReadingSource = "MANUAL" | "DEVICE_IMPORT" | "WHATSAPP" | "OCR";
export type GlucoseReading = { id: string; value: number; recordedAt: string; context: MealContext; source: ReadingSource; verified: boolean };

export const seedReadings: GlucoseReading[] = [
  { id: "r1", value: 106, recordedAt: "2026-07-26T07:15:00", context: "FASTING", source: "MANUAL", verified: true },
  { id: "r2", value: 154, recordedAt: "2026-07-26T09:20:00", context: "AFTER_MEAL", source: "MANUAL", verified: true },
  { id: "r3", value: 128, recordedAt: "2026-07-26T13:10:00", context: "BEFORE_MEAL", source: "DEVICE_IMPORT", verified: true },
  { id: "r4", value: 171, recordedAt: "2026-07-26T15:10:00", context: "AFTER_MEAL", source: "DEVICE_IMPORT", verified: true },
  { id: "r5", value: 119, recordedAt: "2026-07-26T19:30:00", context: "BEFORE_MEAL", source: "MANUAL", verified: true },
];
