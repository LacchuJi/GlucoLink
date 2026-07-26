"use client";

import { useEffect, useState } from "react";
import { analytics } from "@/features/glucose/analytics";
import Link from "next/link";

type PatientProfileData = {
  patient: { id: string; name: string; email: string };
  readings: Array<{
    id: string;
    valueMgDl?: number;
    value?: number;
    recordedAt: string;
    context?: string;
    source?: string;
    verifiedAt?: string | null;
    verified?: boolean;
  }>;
  alerts: Array<{ id: string; title: string; explanation: string }>;
};

type ClinicalNote = {
  id: string;
  content: string;
  status: "draft" | "signed";
  createdAt: string;
};

export function PatientProfile({ patientId }: { patientId: string }) {
  const [data, setData] = useState<PatientProfileData | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftContent, setDraftContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/clinical/patients/${patientId}`).then((r) => r.json()),
      fetch(`/api/clinical/notes?patientId=${patientId}`).then((r) => r.json())
    ]).then(([profileRes, notesRes]) => {
      if (profileRes.patient) setData(profileRes);
      if (notesRes.notes) setNotes(notesRes.notes);
    }).catch(() => setError("Failed to load patient data")).finally(() => setLoading(false));
  }, [patientId]);

  async function saveNote(status: "draft" | "signed") {
    if (!draftContent.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/clinical/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, content: draftContent, status })
      });
      const json = await res.json();
      if (json.note) {
        setNotes((prev) => [json.note, ...prev]);
        setDraftContent("");
      } else {
        setError(json.error || "Failed to save note");
      }
    } catch {
      setError("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) return <main className="clinical-shell"><div style={{padding:"2rem", color:"#888"}}>Loading patient record...</div></main>;
  if (!data) return <main className="clinical-shell"><div style={{padding:"2rem", color:"red"}}>Failed to load patient data</div></main>;

  const stats = analytics(
    data.readings.map((reading) => ({
      value: reading.valueMgDl ?? reading.value,
      valueMgDl: reading.valueMgDl ?? reading.value,
      recordedAt: reading.recordedAt,
      context: (reading.context as "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL" | "BEDTIME" | "RANDOM") ?? "RANDOM",
      source: (reading.source as "MANUAL" | "DEVICE_IMPORT" | "WHATSAPP" | "OCR") ?? "MANUAL",
      verified: Boolean(reading.verifiedAt ?? reading.verified),
    }))
  );

  return (
    <main className="clinical-shell">
      <header className="clinical-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/clinician" className="back-btn">← Back to list</Link>
          <div>
            <h1>{data.patient.name}</h1>
            <p style={{ color: "#888", fontSize: "14px" }}>{data.patient.email} · ID: {patientId.slice(0,8)}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="profile">DR</button>
        </div>
      </header>
      
      <div className="profile-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", padding: "2rem" }}>
        <div className="left-col" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <section className="metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <MetricCard label="Average Glucose" value={stats.average ? `${stats.average} mg/dL` : "—"} tone="blue" />
            <MetricCard label="Time in Range" value={stats.tir ? `${stats.tir}%` : "—"} tone="green" />
            <MetricCard label="Estimated A1C" value={stats.a1c ? `${stats.a1c}%` : "—"} tone="purple" />
            <MetricCard label="High Events" value={stats.highEvents.toString()} tone="amber" />
          </section>

          <section className="chart-card" style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333" }}>
            <h2 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1rem" }}>Recent Readings</h2>
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "1rem" }}>
              {data.readings.slice(0, 15).map(r => {
                const value = r.valueMgDl ?? r.value ?? 0;
                return (
                  <div key={r.id} style={{ minWidth: "60px", padding: "0.75rem", background: "#222", borderRadius: "8px", textAlign: "center" }}>
                    <strong style={{ display: "block", color: value > 180 ? "#facc15" : value < 70 ? "#f87171" : "#4ade80" }}>{value}</strong>
                    <small style={{ color: "#888", fontSize: "11px" }}>{new Date(r.recordedAt).toLocaleDateString(undefined, {month:"short", day:"numeric"})}</small>
                  </div>
                );
              })}
              {data.readings.length === 0 && <p style={{color: "#888", fontSize: "14px"}}>No readings available.</p>}
            </div>
          </section>

          <section className="alerts-section">
            <h2 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1rem" }}>Active Alerts ({data.alerts.length})</h2>
            {data.alerts.length === 0 ? (
              <div style={{ padding: "1rem", background: "#111", borderRadius: "8px", color: "#888", border: "1px dashed #333" }}>No active alerts for this patient.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {data.alerts.map(a => (
                  <div key={a.id} style={{ padding: "1rem", background: "#1a1311", borderLeft: "4px solid #ef4444", borderRadius: "8px" }}>
                    <h3 style={{ fontSize: "14px", color: "#ef4444", margin: "0 0 0.5rem 0" }}>{a.title}</h3>
                    <p style={{ color: "#aaa", fontSize: "13px", margin: 0 }}>{a.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="right-col" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <section className="notes-section" style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333", display: "flex", flexDirection: "column", height: "100%", maxHeight: "calc(100vh - 120px)" }}>
            <h2 style={{ fontSize: "1rem", color: "#fff", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
              Clinical Notes
              <span style={{ fontSize: "12px", padding: "2px 8px", background: "#222", borderRadius: "10px", color: "#888" }}>{notes.length} Total</span>
            </h2>
            
            <div className="composer" style={{ marginBottom: "1.5rem", background: "#0a0a0a", padding: "1rem", borderRadius: "8px", border: "1px solid #222" }}>
              <textarea 
                value={draftContent}
                onChange={e => setDraftContent(e.target.value)}
                placeholder="Write a clinical note..."
                style={{ width: "100%", background: "transparent", border: "none", color: "#fff", outline: "none", resize: "vertical", minHeight: "80px", fontSize: "14px" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                {error && <span style={{ color: "red", fontSize: "12px", alignSelf: "center", marginRight: "auto" }}>{error}</span>}
                <button onClick={() => saveNote("draft")} disabled={savingNote || !draftContent} style={{ padding: "6px 12px", background: "#222", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>Save Draft</button>
                <button onClick={() => saveNote("signed")} disabled={savingNote || !draftContent} style={{ padding: "6px 12px", background: "#4ade80", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>Sign & Lock</button>
              </div>
            </div>

            <div className="notes-list" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {notes.map(note => (
                <article key={note.id} style={{ padding: "1rem", background: "#1a1a1a", borderRadius: "8px", border: "1px solid #2a2a2a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "11px", color: note.status === "signed" ? "#4ade80" : "#facc15", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
                      {note.status === "signed" ? "Signed" : "Draft"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#666" }}>{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ color: "#ccc", fontSize: "14px", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{note.content}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({label, value, tone}: {label:string, value:string, tone:string}) {
  const colors: Record<string, string> = { blue: "#60a5fa", green: "#4ade80", purple: "#c084fc", amber: "#facc15" };
  return (
    <div style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333", borderTop: `3px solid ${colors[tone]}` }}>
      <p style={{ margin: "0 0 0.5rem 0", fontSize: "12px", color: "#888", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</p>
      <strong style={{ fontSize: "1.5rem", color: "#fff" }}>{value}</strong>
    </div>
  );
}
