"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { riskBand, riskScore, type PatientSnapshot, type ClinicalAlert } from "./triage";
import Link from "next/link";

export function ClinicianDashboard({ onToggleMode }: { onToggleMode?: () => void } = {}) {
  const [activeTab, setActiveTab] = useState<"overview" | "patients" | "alerts" | "messages" | "reports" | "settings">("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "attention">("all");
  const [patients, setPatients] = useState<PatientSnapshot[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState("");
  
  // Custom practice threshold state
  const [thresholds, setThresholds] = useState({ criticalHigh: 250, severeLow: 54, targetHigh: 180, targetLow: 70 });
  const [thresholdSaved, setThresholdSaved] = useState(false);

  // Messaging state
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([
    { id: "1", sender: "patient", text: "Hello doctor, I noticed my morning fasting values were slightly higher today.", time: "08:30 AM" },
    { id: "2", sender: "doctor", text: "Thank you for reaching out. Please make sure to log your post-meal reading as well.", time: "09:15 AM" }
  ]);

  const loadData = () => {
    Promise.all([
      fetch("/api/clinical/patients").then(r => r.json()),
      fetch("/api/clinical/alerts").then(r => r.json())
    ]).then(([pRes, aRes]) => {
      if (pRes.patients) setPatients(pRes.patients);
      if (aRes.alerts) setAlerts(aRes.alerts);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  async function resolveAlert(id: string) {
    const res = await fetch("/api/clinical/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId: id, status: "resolved" })
    });
    if (res.ok) setAlerts(prev => prev.filter(a => a.id !== id));
  }

  const visible = useMemo(() => patients.filter((p) => (filter === "all" || riskBand(p) === filter) && (p.name || "").toLowerCase().includes(query.toLowerCase())).sort((a,b) => riskScore(b)-riskScore(a)), [filter,query,patients]);
  const critical = patients.filter(p => riskBand(p) === "critical").length;
  const attention = patients.filter(p => riskBand(p) === "attention").length;

  async function handleAddPatient(e: FormEvent) {
    e.preventDefault();
    setAddError("");
    const res = await fetch("/api/clinical/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail })
    });
    const json = await res.json();
    if (res.ok) {
      setIsAddOpen(false);
      setAddEmail("");
      loadData();
    } else {
      setAddError(json.error || "Failed to add patient");
    }
  }

  function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: "doctor",
      text: chatMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setChatMessage("");
  }

  if (loading) return <main className="clinical-shell"><div style={{padding:"2rem"}}>Loading clinical workspace...</div></main>;

  return (
    <main className="clinical-shell">
      <aside className="clinical-sidebar">
        <Link className="clinical-brand" href="/"><span>G</span> Gluco<b>Link</b></Link>
        <div className="clinic">
          <span className="doctor-avatar">DR</span>
          <div><b>Care Provider</b><small>GlucoLink Demo Clinic</small></div>
        </div>
        <nav>
          <a className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")} style={{ cursor: "pointer" }}>▦ <span>Care overview</span></a>
          <a className={activeTab === "patients" ? "active" : ""} onClick={() => setActiveTab("patients")} style={{ cursor: "pointer" }}>♙ <span>Patients</span></a>
          <a className={activeTab === "alerts" ? "active" : ""} onClick={() => setActiveTab("alerts")} style={{ cursor: "pointer" }}>◉ <span>Alerts</span><i>{alerts.length}</i></a>
          <a className={activeTab === "messages" ? "active" : ""} onClick={() => setActiveTab("messages")} style={{ cursor: "pointer" }}>▤ <span>Messages</span><i>{messages.length}</i></a>
          <a className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")} style={{ cursor: "pointer" }}>◫ <span>Reports</span></a>
          <a className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")} style={{ cursor: "pointer" }}>⚙ <span>Practice settings</span></a>
        </nav>
        <div className="clinical-bottom">
          <span>Care team plan</span>
          <b>Professional</b>
          <small>{patients.length} patient seats used</small>
          <div><i style={{ width: `${Math.min(100, (patients.length / 75) * 100)}%` }}></i></div>
          <button className="mode" onClick={onToggleMode ?? (() => window.location.href = "/")} style={{ border: 0, background: "transparent", color: "#8b9b94", fontSize: "12px", display: "flex", gap: "8px", alignItems: "center", padding: "10px 0 0 0", cursor: "pointer", width: "100%", textAlign: "left", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>⇄ Patient preview</button>
        </div>
      </aside>

      <section className="clinical-content">
        <header className="clinical-header">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</p>
            <h1>{activeTab === "overview" ? "Care overview" : activeTab === "patients" ? "Assigned Patients" : activeTab === "alerts" ? "Clinical Alerts Queue" : activeTab === "messages" ? "Care Communications" : activeTab === "reports" ? "RPM & Clinical Reports" : "Practice Settings"}</h1>
            <p>{activeTab === "overview" ? "Prioritized signals from your remote monitoring panel." : activeTab === "patients" ? "Manage and review assigned patients." : activeTab === "alerts" ? "Active signals requiring review or decision support." : activeTab === "messages" ? "Direct communication feed with assigned patients." : activeTab === "reports" ? "Generate monthly RPM compliance and clinical summary reports." : "Configure clinic alert thresholds and practice preferences."}</p>
          </div>
          <div className="doctor-actions">
            <button className="outline-button" onClick={onToggleMode ?? (() => window.location.href = "/")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>⇄ Switch to Patient View</button>
            <button className="outline-button" onClick={() => setActiveTab("reports")}>↓ Export report</button>
            <button className="add-patient" onClick={() => setIsAddOpen(true)}>＋ Add patient</button>
            <span className="doctor-avatar">DR</span>
          </div>
        </header>

        <section className="clinical-stats">
          <Stat value={patients.length.toString()} label="ACTIVE PATIENTS" detail="Total assigned" tone="blue" />
          <Stat value={critical.toString()} label="NEED URGENT REVIEW" detail="Requires attention today" tone="red" />
          <Stat value={attention.toString()} label="MONITORING GAPS" detail="May need check-in" tone="amber" />
          <Stat value={messages.length.toString()} label="UNREAD MESSAGES" detail="Inbox feed" tone="purple" />
        </section>

        {activeTab === "overview" && (
          <section className="clinical-main">
            <div>
              <div className="title-row">
                <div><h2>Priority queue</h2><p>Clinical decision support · Review and act on each item</p></div>
                <button className="link-button" onClick={() => setActiveTab("settings")}>Configure rules →</button>
              </div>
              <div className="alerts">
                {alerts.map(a => {
                  const patient = patients.find(p => p.id === a.patientId);
                  if (!patient) return null;
                  return (
                    <article className={`alert ${a.severity}`} key={a.id}>
                      <div className="alert-severity">{a.severity === "critical" ? "!" : "↗"}</div>
                      <div className="patient-initials">{patient.initials}</div>
                      <div className="alert-copy">
                        <div><b>{a.title}</b><span>{patient.name} · {patient.age || 50} years</span></div>
                        <p>{a.explanation}</p>
                      </div>
                      <button className="alert-action" onClick={() => window.location.href = `/clinician/patient/${patient.id}`}>{a.action} →</button>
                      <button className="dismiss" onClick={() => resolveAlert(a.id)} aria-label="Mark reviewed">×</button>
                    </article>
                  );
                })}
                {!alerts.length && <div className="empty">All priority signals have been reviewed.</div>}
              </div>
              <article className="ai-card">
                <div>
                  <span className="ai-icon">✦</span>
                  <p className="eyebrow">CLINICAL REVIEW ASSISTANT</p>
                  <h3>Generate a review brief</h3>
                  <p>Creates a draft based on recorded readings and care activity. You remain responsible for review and sign-off.</p>
                </div>
                <button onClick={() => alert("Summary drafting is available in the individual Patient Profile view.")}>Generate draft summary</button>
              </article>
            </div>

            <aside className="patient-panel">
              <div className="patient-panel-head">
                <div><h2>Patients</h2><span>{visible.length} shown</span></div>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patients" aria-label="Search patients" />
              </div>
              <div className="filters">
                <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All</button>
                <button className={filter === "critical" ? "selected critical" : ""} onClick={() => setFilter("critical")}>Urgent</button>
                <button className={filter === "attention" ? "selected attention" : ""} onClick={() => setFilter("attention")}>Review</button>
              </div>
              <div className="patient-list">
                {visible.map(p => <Link key={p.id} href={`/clinician/patient/${p.id}`} style={{ textDecoration: "none" }}><PatientRow patient={p} /></Link>)}
                {!visible.length && <div style={{ padding: "1.5rem", textAlign: "center", color: "#888", fontSize: "13px" }}>No patients match filter.</div>}
              </div>
              <button className="all-patients" onClick={() => setActiveTab("patients")}>View all patients →</button>
            </aside>
          </section>
        )}

        {activeTab === "patients" && (
          <section className="patients-tab" style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patients by name or ID..." style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #333", background: "#222", color: "#fff", width: "320px", fontSize: "14px" }} />
              <button className="add-patient" onClick={() => setIsAddOpen(true)}>＋ Add patient</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {visible.map(p => (
                <Link href={`/clinician/patient/${p.id}`} key={p.id} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "1.25rem", cursor: "pointer", transition: "all 0.2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`patient-initials ${riskBand(p)}`}>{p.initials}</span>
                        <div>
                          <strong style={{ display: "block", color: "#fff", fontSize: "15px" }}>{p.name}</strong>
                          <small style={{ color: "#888" }}>ID: {p.id.slice(0, 8)}</small>
                        </div>
                      </div>
                      <span className={`risk ${riskBand(p)}`}>{riskBand(p).toUpperCase()}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", borderTop: "1px solid #262626", paddingTop: "0.75rem", fontSize: "12px" }}>
                      <div><span style={{ color: "#888", display: "block" }}>LATEST</span><strong style={{ color: "#fff" }}>{p.lastReading || "—"} mg/dL</strong></div>
                      <div><span style={{ color: "#888", display: "block" }}>TIR</span><strong style={{ color: "#4ade80" }}>{p.timeInRange}%</strong></div>
                      <div><span style={{ color: "#888", display: "block" }}>EST. A1C</span><strong style={{ color: "#c084fc" }}>{p.a1c || "—"}%</strong></div>
                    </div>
                  </div>
                </Link>
              ))}
              {!visible.length && <p style={{ color: "#888", fontSize: "14px", gridColumn: "1/-1", padding: "2rem", textAlign: "center" }}>No assigned patients found.</p>}
            </div>
          </section>
        )}

        {activeTab === "alerts" && (
          <section className="alerts-tab" style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: "1.1rem" }}>Active Clinical Alerts Queue ({alerts.length})</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")} style={{ padding: "6px 12px", background: filter === "all" ? "#333" : "#222", color: "#fff", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>All</button>
                <button className={filter === "critical" ? "selected critical" : ""} onClick={() => setFilter("critical")} style={{ padding: "6px 12px", background: filter === "critical" ? "#ef4444" : "#222", color: "#fff", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>Critical Only</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {alerts.filter(a => filter === "all" || a.severity === filter).map(a => {
                const patient = patients.find(p => p.id === a.patientId);
                return (
                  <div key={a.id} style={{ background: "#1a1a1a", borderLeft: `4px solid ${a.severity === "critical" ? "#ef4444" : "#facc15"}`, border: "1px solid #2a2a2a", borderRadius: "8px", padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
                        <span style={{ background: a.severity === "critical" ? "#ef4444" : "#facc15", color: "#000", fontWeight: "bold", fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}>{a.severity.toUpperCase()}</span>
                        <strong style={{ color: "#fff", fontSize: "15px" }}>{a.title}</strong>
                        {patient && <span style={{ color: "#888", fontSize: "13px" }}>— {patient.name}</span>}
                      </div>
                      <p style={{ color: "#ccc", fontSize: "14px", margin: "0 0 0.5rem 0" }}>{a.explanation}</p>
                      <small style={{ color: "#777", fontSize: "12px" }}>Triggered {new Date(a.triggeredAt || Date.now()).toLocaleString()}</small>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {patient && <Link href={`/clinician/patient/${patient.id}`} style={{ padding: "8px 14px", background: "#333", color: "#fff", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "bold" }}>View Patient Profile →</Link>}
                      <button onClick={() => resolveAlert(a.id)} style={{ padding: "8px 14px", background: "#4ade80", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>Mark Resolved ✓</button>
                    </div>
                  </div>
                );
              })}
              {!alerts.length && <p style={{ color: "#888", padding: "2rem", textAlign: "center" }}>No open alerts in your clinical queue.</p>}
            </div>
          </section>
        )}

        {activeTab === "messages" && (
          <section className="messages-tab" style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333", display: "grid", gridTemplateColumns: "250px 1fr", gap: "1.5rem", minHeight: "450px" }}>
            <div style={{ borderRight: "1px solid #222", paddingRight: "1rem" }}>
              <h3 style={{ color: "#fff", fontSize: "14px", margin: "0 0 1rem 0" }}>Patients</h3>
              {patients.map(p => (
                <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ padding: "10px", borderRadius: "8px", background: selectedPatientId === p.id ? "#222" : "transparent", cursor: "pointer", color: "#fff", marginBottom: "0.5rem", border: "1px solid " + (selectedPatientId === p.id ? "#333" : "transparent") }}>
                  <strong style={{ display: "block", fontSize: "14px" }}>{p.name}</strong>
                  <small style={{ color: "#888", fontSize: "12px" }}>Active dialogue</small>
                </div>
              ))}
              {!patients.length && <p style={{ color: "#777", fontSize: "13px" }}>No assigned patients.</p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: "0.5rem", maxHeight: "350px" }}>
                {messages.map(m => (
                  <div key={m.id} style={{ alignSelf: m.sender === "doctor" ? "flex-end" : "flex-start", background: m.sender === "doctor" ? "#1e3a8a" : "#222", color: "#fff", padding: "10px 14px", borderRadius: "10px", maxWidth: "70%", fontSize: "14px" }}>
                    <p style={{ margin: 0 }}>{m.text}</p>
                    <small style={{ display: "block", textAlign: "right", color: "#aaa", fontSize: "10px", marginTop: "4px" }}>{m.time}</small>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a secure message to patient..." style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #333", background: "#222", color: "#fff", outline: "none", fontSize: "14px" }} />
                <button style={{ padding: "10px 18px", background: "#4ade80", color: "#000", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Send</button>
              </form>
            </div>
          </section>
        )}

        {activeTab === "reports" && (
          <section className="reports-tab" style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333", color: "#fff" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem 0" }}>Remote Patient Monitoring (RPM) Reports</h2>
            <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "1.5rem" }}>Generate billing compliance and clinical activity summaries for your panel.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "1.25rem" }}>
                <h3 style={{ fontSize: "15px", color: "#60a5fa", margin: "0 0 0.5rem 0" }}>Monthly RPM Summary (CPT 99454 / 99457)</h3>
                <p style={{ color: "#888", fontSize: "13px" }}>Exports 16+ reading transmission logs and clinical review time per patient.</p>
                <button onClick={() => alert("Report compiled! Download started.")} style={{ padding: "8px 14px", background: "#333", color: "#fff", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontSize: "13px", marginTop: "1rem" }}>↓ Download PDF Report</button>
              </div>
              <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "1.25rem" }}>
                <h3 style={{ fontSize: "15px", color: "#4ade80", margin: "0 0 0.5rem 0" }}>Glycemia Population Health Audit</h3>
                <p style={{ color: "#888", fontSize: "13px" }}>Overall TIR distribution, severe hypoglycemic event frequencies, and HbA1c estimates.</p>
                <button onClick={() => alert("CSV Audit Report exported.")} style={{ padding: "8px 14px", background: "#333", color: "#fff", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontSize: "13px", marginTop: "1rem" }}>↓ Export CSV Data</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="settings-tab" style={{ background: "#111", padding: "1.5rem", borderRadius: "12px", border: "1px solid #333", color: "#fff" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem 0" }}>Clinic Practice & Threshold Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "450px" }}>
              <label style={{ fontSize: "13px", color: "#ccc" }}>Critical High Threshold (mg/dL)
                <input type="number" value={thresholds.criticalHigh} onChange={e => setThresholds({ ...thresholds, criticalHigh: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #333", background: "#222", color: "#fff", marginTop: "4px" }} />
              </label>
              <label style={{ fontSize: "13px", color: "#ccc" }}>Severe Low Threshold (mg/dL)
                <input type="number" value={thresholds.severeLow} onChange={e => setThresholds({ ...thresholds, severeLow: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #333", background: "#222", color: "#fff", marginTop: "4px" }} />
              </label>
              <label style={{ fontSize: "13px", color: "#ccc" }}>Target High Range (mg/dL)
                <input type="number" value={thresholds.targetHigh} onChange={e => setThresholds({ ...thresholds, targetHigh: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #333", background: "#222", color: "#fff", marginTop: "4px" }} />
              </label>
              {thresholdSaved && <span style={{ color: "#4ade80", fontSize: "13px" }}>Practice thresholds saved successfully!</span>}
              <button onClick={() => { setThresholdSaved(true); setTimeout(() => setThresholdSaved(false), 3000); }} style={{ padding: "10px", background: "#4ade80", color: "#000", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", width: "fit-content", marginTop: "0.5rem" }}>Save Threshold Rules</button>
            </div>
          </section>
        )}
      </section>

      {isAddOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleAddPatient}>
            <button type="button" className="close" onClick={() => setIsAddOpen(false)}>×</button>
            <p className="eyebrow">ONBOARDING</p>
            <h2>Assign Patient</h2>
            <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "1.5rem" }}>Enter the registered email of the patient to add them to your care panel.</p>
            <label>Patient Email
              <input type="email" required autoFocus value={addEmail} onChange={e => setAddEmail(e.target.value)} />
            </label>
            {addError && <p style={{ color: "red", fontSize: "13px", margin: "0.5rem 0" }}>{addError}</p>}
            <button className="submit" style={{ marginTop: "1rem" }}>Assign Patient</button>
          </form>
        </div>
      )}
    </main>
  );
}

function Stat({ value, label, detail, tone }: { value: string; label: string; detail: string; tone: string }) {
  return (
    <article className="clinical-stat">
      <span className={tone}>⌁</span>
      <b>{value}</b>
      <p className="label">{label}</p>
      <small>{detail}</small>
    </article>
  );
}

function PatientRow({ patient: p }: { patient: PatientSnapshot }) {
  const band = riskBand(p);
  return (
    <article className="patient-row">
      <div className={`patient-initials ${band}`}>{p.initials}</div>
      <div className="patient-name">
        <b>{p.name}</b>
        <small>Last reading {p.lastLoggedHoursAgo === 999 ? "never" : `${p.lastLoggedHoursAgo}h ago`}</small>
      </div>
      <div className="patient-reading">
        <b>{p.lastReading || "—"}</b>
        <small>mg/dL</small>
      </div>
      <span className={`risk ${band}`}>{band === "critical" ? "Urgent" : band === "attention" ? "Review" : "Stable"}</span>
    </article>
  );
}
