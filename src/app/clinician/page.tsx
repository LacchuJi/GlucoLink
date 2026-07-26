import { ClinicianDashboard } from "@/features/clinical/clinician-dashboard";
import { requireDoctor } from "@/lib/access";
import { redirect } from "next/navigation";

export default async function ClinicianPage() {
  try {
    await requireDoctor();
  } catch {
    redirect("/");
  }
  return <ClinicianDashboard />; 
}
