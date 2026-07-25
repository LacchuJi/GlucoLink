import { generateAlerts, patientSnapshots, riskBand, riskScore } from "@/features/clinical/triage";

export async function GET() {
  // This endpoint becomes tenant-scoped after authentication middleware is enabled.
  return Response.json({ patients: patientSnapshots.map((p) => ({ ...p, riskScore: riskScore(p), riskBand: riskBand(p) })), alerts: generateAlerts(patientSnapshots), generatedAt: new Date().toISOString() });
}
