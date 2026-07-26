export type PatientSnapshot = { id: string; name: string; initials: string; age: number; a1c: number; timeInRange: number; average: number; lastReading: number; lastLoggedHoursAgo: number; unreadMessages: number; lowEvents7d: number; trendPct14d: number };
export type RiskBand = "critical" | "attention" | "stable";
export type ClinicalAlert = { id: string; patientId: string; severity: "critical" | "attention"; title: string; explanation: string; action: string; status?: string; triggeredAt?: string; ruleKey?: string };

export function riskScore(p: PatientSnapshot) { return Math.min(100, (p.lastReading >= 250 ? 38 : p.lastReading > 180 ? 18 : 0) + (p.timeInRange < 55 ? 28 : p.timeInRange < 70 ? 13 : 0) + Math.min(24, p.lowEvents7d * 8) + (p.lastLoggedHoursAgo > 36 ? 20 : 0) + (p.trendPct14d >= 15 ? 15 : 0)); }
export function riskBand(p: PatientSnapshot): RiskBand { const s = riskScore(p); return s >= 55 ? "critical" : s >= 20 ? "attention" : "stable"; }

