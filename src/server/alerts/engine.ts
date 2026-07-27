import { prisma } from "@/lib/prisma";

export async function evaluateAlerts(patientId: string) {
  // Fetch latest readings to evaluate
  const readings = await prisma.reading.findMany({
    where: { patientId },
    orderBy: { recordedAt: "desc" },
    take: 10,
  });

  if (readings.length === 0) return;

  const latest = readings[0];
  
  // 1. Critical High Alert
  if (latest.valueMgDl >= 250) {
    await createAlertIfMissing(patientId, "CRITICAL_HIGH", "critical", "Critical High Glucose", `Patient recorded a glucose of ${latest.valueMgDl} mg/dL, which requires immediate attention.`, "Review patient");
  } else {
    await resolveAlertIfOpen(patientId, "CRITICAL_HIGH");
  }

  // 2. Severe Low Alert
  if (latest.valueMgDl <= 54) {
    await createAlertIfMissing(patientId, "SEVERE_LOW", "critical", "Severe Low Glucose", `Patient recorded a severe low glucose of ${latest.valueMgDl} mg/dL.`, "Contact patient");
    await resolveAlertIfOpen(patientId, "LOW");
  } else if (latest.valueMgDl < 70) {
    await createAlertIfMissing(patientId, "LOW", "attention", "Low Glucose", `Patient recorded a low glucose of ${latest.valueMgDl} mg/dL.`, "Review trend");
    await resolveAlertIfOpen(patientId, "SEVERE_LOW");
  } else {
    await resolveAlertIfOpen(patientId, "SEVERE_LOW");
    await resolveAlertIfOpen(patientId, "LOW");
  }

  // 3. High Pattern (e.g., > 180 consistently)
  // Basic implementation: if last 3 readings are > 180
  if (readings.length >= 3 && readings.slice(0,3).every(r => r.valueMgDl > 180)) {
    await createAlertIfMissing(patientId, "PATTERN_HIGH", "attention", "Consistent High Pattern", `Patient's last 3 readings have all been above 180 mg/dL.`, "Adjust care plan");
  } else {
    await resolveAlertIfOpen(patientId, "PATTERN_HIGH");
  }
}

async function createAlertIfMissing(patientId: string, ruleKey: string, severity: string, title: string, explanation: string, action: string) {
  const existing = await prisma.alert.findFirst({
    where: { patientId, ruleKey, status: "open" }
  });
  
  if (!existing) {
    await prisma.alert.create({
      data: {
        patientId,
        ruleKey,
        severity,
        status: "open",
        title,
        explanation,
        action
      }
    });
  }
}

async function resolveAlertIfOpen(patientId: string, ruleKey: string) {
  await prisma.alert.updateMany({
    where: { patientId, ruleKey, status: "open" },
    data: { status: "resolved", resolvedAt: new Date() }
  });
}
