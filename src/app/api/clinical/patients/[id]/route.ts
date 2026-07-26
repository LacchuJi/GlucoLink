import { requireAssignedPatient } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { patient, user } = await requireAssignedPatient(id);
    
    // Fetch last 90 days of readings
    const readings = await prisma.reading.findMany({
      where: { patientId: id },
      orderBy: { recordedAt: "desc" },
      take: 200,
    });
    
    const alerts = await prisma.alert.findMany({
      where: { patientId: id, status: "open" },
      orderBy: { triggeredAt: "desc" },
    });
    
    return Response.json({
      patient: {
        id: patient.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      readings,
      alerts
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
