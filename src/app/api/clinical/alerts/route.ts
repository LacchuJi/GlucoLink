import { requireUser, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) {
      doctor = await prisma.doctor.findFirst();
    }
    
    if (!doctor) {
      return Response.json({ alerts: [] });
    }
    
    const assignments = await prisma.careAssignment.findMany({
      where: { doctorId: doctor.id },
      select: { patientId: true }
    });
    
    const patientIds = assignments.map(a => a.patientId);
    
    const alerts = await prisma.alert.findMany({
      where: {
        patientId: { in: patientIds },
        status: "open"
      },
      orderBy: { triggeredAt: "desc" }
    });

    return Response.json({ alerts });
  } catch (error) {
    console.error("Alerts API Error:", error);
    return Response.json({ alerts: [] });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) {
      doctor = await prisma.doctor.findFirst();
    }
    if (!doctor) return Response.json({ error: "No clinician found" }, { status: 400 });

    const body = await request.json();
    const schema = z.object({ alertId: z.string(), status: z.literal("resolved") });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
    
    const alert = await prisma.alert.findUnique({ where: { id: parsed.data.alertId } });
    if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
    
    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: "resolved", resolvedAt: new Date() }
    });
    
    await audit(user.id, "UPDATE", "Alert", alert.id);
    
    return Response.json({ alert: updated });
  } catch (error) {
    console.error("Alerts PATCH Error:", error);
    return Response.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
