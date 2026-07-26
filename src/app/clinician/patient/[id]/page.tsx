import { PatientProfile } from "@/features/clinical/patient-profile";
import { requireDoctor } from "@/lib/access";
import { redirect } from "next/navigation";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDoctor();
  } catch {
    redirect("/");
  }
  const { id } = await params;
  return <PatientProfile patientId={id} />;
}
