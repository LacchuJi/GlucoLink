"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignInPage() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      const name = String(form.get("name") || "");
      const clinicName = String(form.get("clinicName") || "");

      if (register) {
        const result = await authClient.signUp.email({ name, email, password });
        if (result.error) {
          setError(result.error.message ?? "Account creation failed.");
          setPending(false);
          return;
        }

        if (selectedRole === "DOCTOR") {
          const onboarding = await fetch("/api/onboarding/doctor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clinicName })
          });
          if (!onboarding.ok) {
            setError("Doctor onboarding failed.");
            setPending(false);
            return;
          }
          router.replace("/clinician");
          router.refresh();
          return;
        } else {
          const onboarding = await fetch("/api/onboarding/patient", { method: "POST" });
          if (!onboarding.ok) {
            setError("Patient onboarding failed.");
            setPending(false);
            return;
          }
          router.replace("/");
          router.refresh();
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message ?? "Invalid email or password.");
          setPending(false);
          return;
        }

        // Smart routing check
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.user?.role === "DOCTOR") {
            router.replace("/clinician");
          } else {
            router.replace("/");
          }
        } else {
          router.replace("/");
        }
        router.refresh();
      }
    } catch {
      setError("Cannot reach account service. Confirm database connection.");
    } finally {
      setPending(false);
    }
  }

  async function handleDemoLogin(role: "DOCTOR" | "PATIENT") {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Demo login failed.");
        setPending(false);
        return;
      }
      // Server already set the session cookie — just redirect
      router.replace(data.redirectTo || "/");
      router.refresh();
    } catch {
      setError("Demo authentication error.");
    } finally {
      setPending(false);
    }
  }


  return (
    <main className="auth-page">
      <section className="auth-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <Link className="auth-brand" href="/" style={{ marginBottom: 0 }}>
            <span>G</span> Gluco<b>Link</b>
          </Link>
          <ThemeToggle />
        </div>

        <p className="eyebrow">SECURE HEALTH PLATFORM</p>
        <h1>{register ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-copy">
          {register
            ? "Sign up to track glucose readings or manage your remote care panel."
            : "Sign in to access your health record and care management tools."}
        </p>

        {register && (
          <div className="role-toggle">
            <button
              type="button"
              className={selectedRole === "PATIENT" ? "active" : ""}
              onClick={() => setSelectedRole("PATIENT")}
            >
              👤 Patient
            </button>
            <button
              type="button"
              className={selectedRole === "DOCTOR" ? "active" : ""}
              onClick={() => setSelectedRole("DOCTOR")}
            >
              🩺 Doctor / Clinician
            </button>
          </div>
        )}

        <form onSubmit={submit}>
          {register && (
            <label>
              Full name
              <input required minLength={2} name="name" autoComplete="name" placeholder="e.g. Sarah Adams" />
            </label>
          )}

          {register && selectedRole === "DOCTOR" && (
            <label>
              Clinic / Practice Name
              <input name="clinicName" placeholder="e.g. GlucoLink Care Clinic" defaultValue="GlucoLink Care Clinic" />
            </label>
          )}

          <label>
            Email address
            <input required type="email" name="email" autoComplete="email" placeholder="name@example.com" />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              minLength={12}
              name="password"
              autoComplete={register ? "new-password" : "current-password"}
            />
            <small>At least 12 characters.</small>
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button disabled={pending} className="auth-submit">
            {pending ? "Please wait…" : register ? `Create ${selectedRole === "DOCTOR" ? "Doctor" : "Patient"} Account` : "Sign in"}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "Already have an account? Sign in" : "New to GlucoLink? Create an account"}
        </button>

        <div className="demo-box">
          <p>⚡ INSTANT 1-CLICK DEMO LOGINS</p>
          <div className="demo-buttons">
            <button type="button" disabled={pending} className="demo-btn" onClick={() => handleDemoLogin("DOCTOR")}>
              🩺 Clinician Demo
            </button>
            <button type="button" disabled={pending} className="demo-btn" onClick={() => handleDemoLogin("PATIENT")}>
              👤 Patient Demo
            </button>
          </div>
        </div>

        <p className="auth-privacy">By continuing, you agree to the Terms of Service and HIPAA Privacy Notice.</p>
      </section>
    </main>
  );
}
