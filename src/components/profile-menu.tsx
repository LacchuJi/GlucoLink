"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type UserProfile = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
  } | null;
  patientId: string | null;
  doctorId: string | null;
  clinicName: string | null;
};

export function ProfileMenu({ defaultInitials }: { defaultInitials?: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setProfile(data);
      })
      .catch(console.error);
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  async function handleUpgradeToDoctor() {
    const res = await fetch("/api/onboarding/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicName: "GlucoLink Care Clinic" })
    });
    if (res.ok) {
      router.replace("/clinician");
      router.refresh();
    }
  }

  const role = profile?.user?.role || "PATIENT";
  const name = profile?.user?.name || "User Account";
  const initials = defaultInitials || (name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "ME");

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        className="profile"
        style={{
          cursor: "pointer",
          border: "2px solid rgba(255,255,255,0.2)",
          fontWeight: "bold",
          fontSize: "11px"
        }}
        aria-label="User Profile Menu"
      >
        {role === "DOCTOR" ? "DR" : initials}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "46px",
            width: "240px",
            background: "#ffffff",
            color: "#182521",
            borderRadius: "14px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            border: "1px solid #e9efec",
            padding: "16px",
            zIndex: 100,
            fontSize: "13px"
          }}
        >
          <div style={{ paddingBottom: "12px", borderBottom: "1px solid #eef1ef", marginBottom: "10px" }}>
            <strong style={{ display: "block", fontSize: "14px", color: "#16251f" }}>{name}</strong>
            <small style={{ color: "#78847f", display: "block", fontSize: "11px", marginTop: "2px" }}>{profile?.user?.email}</small>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
              <span
                style={{
                  background: role === "DOCTOR" ? "#4c76ff" : "#18a47a",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}
              >
                {role}
              </span>
              {profile?.clinicName && <small style={{ color: "#607069", fontSize: "10px" }}>{profile.clinicName}</small>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              onClick={() => { setOpen(false); router.push("/"); }}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                color: "#182521"
              }}
            >
              👤 Patient Dashboard
            </button>

            {role === "DOCTOR" ? (
              <button
                onClick={() => { setOpen(false); router.push("/clinician"); }}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "#f4f8f6",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  color: "#117858"
                }}
              >
                🩺 Clinician Workspace
              </button>
            ) : (
              <button
                onClick={handleUpgradeToDoctor}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "#eaf2ff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  color: "#2563eb"
                }}
              >
                ✚ Upgrade to Doctor Account
              </button>
            )}

            <button
              onClick={handleSignOut}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                color: "#dc2626",
                marginTop: "6px",
                borderTop: "1px solid #f3f4f6"
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
