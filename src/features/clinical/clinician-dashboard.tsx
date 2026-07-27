"use client";
import { useEffect, useMemo, useState, useRef, FormEvent } from "react";
import { riskBand, riskScore, type PatientSnapshot, type ClinicalAlert } from "./triage";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { NotificationToast } from "@/components/notification-toast";

type ApiMessage = {
  id: string;
  patientId: string;
  doctorId: string;
  senderId: string;
  senderRole: "PATIENT" | "DOCTOR";
  content: string;
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
  reading?: {
    valueMgDl: number;
    context: string;
    recordedAt: string;
  } | null;
  attachmentJson?: string | null;
};

type PatientWithUnread = PatientSnapshot & { unreadCount?: number };

export function ClinicianDashboard({ onToggleMode }: { onToggleMode?: () => void } = {}) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "critical" | "attention">("all");
  const [patients, setPatients] = useState<PatientWithUnread[]>([]);
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
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string; sender: string } | null>(null);
  
  const lastMsgCountRef = useRef<number>(0);
  const selectedPatientIdRef = useRef<string>("");

  useEffect(() => {
    selectedPatientIdRef.current = selectedPatientId;
  }, [selectedPatientId]);

  // Directive Modal
  const [isDirectiveOpen, setIsDirectiveOpen] = useState(false);
  const [directiveMed, setDirectiveMed] = useState("Metformin");
  const [directiveDose, setDirectiveDose] = useState("1000 mg");

  const loadData = () => {
    Promise.all([
      fetch("/api/clinical/patients").then(r => r.json()),
      fetch("/api/clinical/alerts").then(r => r.json())
    ]).then(([pRes, aRes]) => {
      if (pRes.patients && pRes.patients.length > 0) {
        setPatients(pRes.patients);
        if (!selectedPatientIdRef.current) {
          setSelectedPatientId(pRes.patients[0].id);
        }
      }
      if (aRes.alerts) setAlerts(aRes.alerts);
      setLoading(false);
    }).catch((err) => {
      console.error("Clinical loadData error:", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Continuous Fast Sync Engine (1500ms)
  const fetchMessages = () => {
    const activeId = selectedPatientIdRef.current;
    const url = activeId ? `/api/clinical/messages?patientId=${activeId}` : `/api/clinical/messages`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.patients && data.patients.length > 0) {
          if (!activeId) {
            setSelectedPatientId(data.patients[0].id);
          }
        }

        if (data.messages) {
          const newMsgs: ApiMessage[] = data.messages;
          if (lastMsgCountRef.current > 0 && newMsgs.length > lastMsgCountRef.current) {
            const latest = newMsgs[newMsgs.length - 1];
            if (latest && latest.senderRole === "PATIENT") {
              const patientObj = patients.find(p => p.id === activeId);
              setActiveToast({
                title: "New Patient Telehealth Message",
                message: latest.content,
                sender: patientObj?.name || "Patient"
              });
            }
          }
          lastMsgCountRef.current = newMsgs.length;
          setMessages(newMsgs);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, [selectedPatientId]);

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

  async function handleSendMessage(e: FormEvent, customText?: string, attachmentPayload?: object) {
    if (e) e.preventDefault();
    const textToSend = customText || chatMessage;
    if ((!textToSend.trim() && !attachmentPayload) || sendingMsg) return;
    setSendingMsg(true);
    try {
      const payload: { patientId?: string; content: string; attachmentJson?: string; senderRole: "DOCTOR" } = {
        patientId: selectedPatientId || undefined,
        content: textToSend,
        senderRole: "DOCTOR"
      };
      if (attachmentPayload) {
        payload.attachmentJson = JSON.stringify(attachmentPayload);
      }

      const res = await fetch("/api/clinical/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        lastMsgCountRef.current += 1;
        setChatMessage("");
        setIsDirectiveOpen(false);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSendingMsg(false);
    }
  }

  function sendCareDirective() {
    handleSendMessage(
      null as unknown as FormEvent,
      `Issued Care Directive: Adjust ${directiveMed} to ${directiveDose}.`,
      { medicationName: directiveMed, newDosage: directiveDose, timing: "Prescribed with meals" }
    );
  }

  if (loading) return <main className="clinical-shell"><div style={{padding:"2rem"}}>Loading clinical workspace...</div></main>;

  const navItems = [
    { id: "overview", label: "Care overview", icon: "▦" },
    { id: "patients", label: "Patients", icon: "♙" },
    { id: "alerts", label: "Alerts Queue", icon: "◉", badge: alerts.length },
    { id: "messages", label: "Telehealth Feed", icon: "▤", badge: messages.length },
    { id: "reports", label: "RPM Reports", icon: "◫" },
    { id: "settings", label: "Practice Settings", icon: "⚙" }
  ];

  return (
    <main className="clinical-shell">
      {activeToast && (
        <NotificationToast
          title={activeToast.title}
          message={activeToast.message}
          sender={activeToast.sender}
          onAction={() => setActiveTab("messages")}
          onClose={() => setActiveToast(null)}
        />
      )}

      <AppSidebar
        role="CLINICIAN"
        userName="Dr. Sarah Adams"
        subtitle="GlucoLink Care Clinic"
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onToggleMode={onToggleMode ?? (() => window.location.href = "/")}
      />

      <section className="clinical-content">
        <AppHeader
          eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
          title={activeTab === "overview" ? "Care Overview" : activeTab === "patients" ? "Assigned Patients" : activeTab === "alerts" ? "Clinical Alerts Queue" : activeTab === "messages" ? "Care Communications & Telehealth" : activeTab === "reports" ? "RPM & Clinical Reports" : "Practice Settings"}
          description={activeTab === "overview" ? "Prioritized signals from your remote monitoring panel." : activeTab === "patients" ? "Manage and review assigned patients." : activeTab === "alerts" ? "Active signals requiring review or decision support." : activeTab === "messages" ? "Direct communication feed with assigned patients." : activeTab === "reports" ? "Generate monthly RPM compliance and clinical summary reports." : "Configure clinic alert thresholds and practice preferences."}
          unreadCount={alerts.length}
          onNotificationClick={() => setActiveTab("alerts")}
          primaryActionLabel="＋ Add patient"
          onPrimaryAction={() => setIsAddOpen(true)}
          userInitials="DR"
        />

        {activeTab === "overview" && (
          <>
            <section className="clinical-stats">
              <Stat value={patients.length.toString()} label="ACTIVE PATIENTS" detail="Total assigned" tone="blue" />
              <Stat value={critical.toString()} label="NEED URGENT REVIEW" detail="Requires attention today" tone="red" />
              <Stat value={attention.toString()} label="MONITORING GAPS" detail="May need check-in" tone="amber" />
              <Stat value={messages.length.toString()} label="TELEHEALTH FEED" detail="Inbox threads" tone="purple" />
            </section>

            <section className="clinical-main" style={{ marginTop: "24px" }}>
              <div>
                <div className="title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", color: "var(--text-heading)", margin: 0 }}>Priority queue</h2>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>Clinical decision support · Review and act on each item</p>
                  </div>
                  <button className="btn-link" onClick={() => setActiveTab("settings")}>Configure rules →</button>
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

                <article className="ai-card" style={{ marginTop: "24px" }}>
                  <div>
                    <span className="ai-icon">✦</span>
                    <p className="eyebrow" style={{ color: "#a5b4fc" }}>CLINICAL REVIEW ASSISTANT</p>
                    <h3>Generate a review brief</h3>
                    <p style={{ color: "#cbd5e1" }}>Creates a draft based on recorded readings and care activity. You remain responsible for review and sign-off.</p>
                  </div>
                  <button onClick={() => alert("Summary drafting is available in the individual Patient Profile view.")}>Generate draft summary</button>
                </article>
              </div>

              <aside className="patient-panel">
                <div className="patient-panel-head">
                  <div><h2>Patients</h2><span>{visible.length} shown</span></div>
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patients..." aria-label="Search patients" />
                </div>
                <div className="filters">
                  <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All</button>
                  <button className={filter === "critical" ? "selected critical" : ""} onClick={() => setFilter("critical")}>Urgent</button>
                  <button className={filter === "attention" ? "selected attention" : ""} onClick={() => setFilter("attention")}>Review</button>
                </div>
                <div className="patient-list">
                  {visible.map(p => <Link key={p.id} href={`/clinician/patient/${p.id}`} style={{ textDecoration: "none" }}><PatientRow patient={p} /></Link>)}
                  {!visible.length && <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No patients match filter.</div>}
                </div>
                <button className="all-patients" onClick={() => setActiveTab("patients")}>View all patients →</button>
              </aside>
            </section>
          </>
        )}

        {activeTab === "patients" && (
          <section className="patients-tab" style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patients by name or ID..." style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--text-heading)", width: "320px", fontSize: "14px", outline: "none" }} />
              <button className="submit" onClick={() => setIsAddOpen(true)} style={{ width: "auto", margin: 0, padding: "9px 18px" }}>＋ Add patient</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {visible.map(p => (
                <Link href={`/clinician/patient/${p.id}`} key={p.id} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1.25rem", cursor: "pointer", transition: "all 0.2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`patient-initials ${riskBand(p)}`}>{p.initials}</span>
                        <div>
                          <strong style={{ display: "block", color: "var(--text-heading)", fontSize: "15px" }}>{p.name}</strong>
                          <small style={{ color: "var(--text-muted)" }}>ID: {p.id.slice(0, 8)}</small>
                        </div>
                      </div>
                      <span className={`risk ${riskBand(p)}`}>{riskBand(p).toUpperCase()}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", fontSize: "12px" }}>
                      <div><span style={{ color: "var(--text-muted)", display: "block" }}>LATEST</span><strong style={{ color: "var(--text-heading)" }}>{p.lastReading ? `${p.lastReading} mg/dL` : "—"}</strong></div>
                      <div><span style={{ color: "var(--text-muted)", display: "block" }}>TIR</span><strong style={{ color: "#10b981" }}>{p.timeInRange}%</strong></div>
                      <div><span style={{ color: "var(--text-muted)", display: "block" }}>EST. A1C</span><strong style={{ color: "#6366f1" }}>{p.a1c ? `${p.a1c}%` : "—"}</strong></div>
                    </div>
                  </div>
                </Link>
              ))}
              {!visible.length && <p style={{ color: "var(--text-muted)", fontSize: "14px", gridColumn: "1/-1", padding: "3rem", textAlign: "center" }}>No assigned patients found.</p>}
            </div>
          </section>
        )}

        {activeTab === "alerts" && (
          <section className="alerts-tab" style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "var(--text-heading)", margin: 0, fontSize: "18px" }}>Active Clinical Alerts Queue ({alerts.length})</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")} style={{ padding: "6px 14px", background: filter === "all" ? "var(--accent-light)" : "var(--bg-subtle)", color: filter === "all" ? "var(--accent-primary)" : "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>All</button>
                <button className={filter === "critical" ? "selected critical" : ""} onClick={() => setFilter("critical")} style={{ padding: "6px 14px", background: filter === "critical" ? "#fef2f2" : "var(--bg-subtle)", color: filter === "critical" ? "#dc2626" : "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Critical Only</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {alerts.filter(a => filter === "all" || a.severity === filter).map(a => {
                const patient = patients.find(p => p.id === a.patientId);
                return (
                  <div key={a.id} style={{ background: "var(--bg-subtle)", borderLeft: `4px solid ${a.severity === "critical" ? "#ef4444" : "#f59e0b"}`, border: "1px solid var(--border-color)", borderRadius: "10px", padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
                        <span style={{ background: a.severity === "critical" ? "#ef4444" : "#f59e0b", color: "#fff", fontWeight: "bold", fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}>{a.severity.toUpperCase()}</span>
                        <strong style={{ color: "var(--text-heading)", fontSize: "15px" }}>{a.title}</strong>
                        {patient && <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>— {patient.name}</span>}
                      </div>
                      <p style={{ color: "var(--text-main)", fontSize: "14px", margin: "0 0 0.5rem 0" }}>{a.explanation}</p>
                      <small style={{ color: "var(--text-muted)", fontSize: "12px" }}>Triggered {new Date(a.triggeredAt || Date.now()).toLocaleString()}</small>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {patient && <Link href={`/clinician/patient/${patient.id}`} style={{ padding: "8px 14px", background: "var(--bg-card)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "bold" }}>View Patient Profile →</Link>}
                      <button onClick={() => resolveAlert(a.id)} style={{ padding: "8px 14px", background: "var(--accent-primary)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>Mark Resolved ✓</button>
                    </div>
                  </div>
                );
              })}
              {!alerts.length && <p style={{ color: "var(--text-muted)", padding: "3rem", textAlign: "center" }}>No open alerts in your clinical queue.</p>}
            </div>
          </section>
        )}

        {activeTab === "messages" && (
          <section className="messages-tab" style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border-color)", display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem", minHeight: "550px" }}>
            <div style={{ borderRight: "1px solid var(--border-color)", paddingRight: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ color: "var(--text-heading)", fontSize: "14px", margin: 0 }}>Assigned Threads</h3>
                <span style={{ fontSize: "10px", color: "var(--accent-primary)", background: "var(--accent-light)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>● 1.5s Sync</span>
              </div>
              {patients.map(p => (
                <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ padding: "10px 12px", borderRadius: "8px", background: selectedPatientId === p.id ? "var(--bg-subtle)" : "transparent", cursor: "pointer", color: "var(--text-main)", marginBottom: "0.5rem", border: "1px solid " + (selectedPatientId === p.id ? "var(--border-color)" : "transparent"), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ display: "block", fontSize: "14px", color: "var(--text-heading)" }}>{p.name}</strong>
                    <small style={{ color: "var(--text-muted)", fontSize: "11px" }}>ID: {p.id.slice(0, 8)}</small>
                  </div>
                  {Boolean(p.unreadCount) && (
                    <span style={{ background: "#ef4444", color: "#fff", borderRadius: "99px", padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }}>{p.unreadCount}</span>
                  )}
                </div>
              ))}
              {!patients.length && <p style={{ color: "var(--text-muted)", fontSize: "13px", padding: "10px 0" }}>No assigned patient threads.</p>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: "0.5rem", maxHeight: "400px" }}>
                {messages.map(m => (
                  <div key={m.id} style={{ alignSelf: m.senderRole === "DOCTOR" ? "flex-end" : "flex-start", background: m.senderRole === "DOCTOR" ? "var(--accent-primary)" : "var(--bg-subtle)", color: m.senderRole === "DOCTOR" ? "#fff" : "var(--text-main)", padding: "14px 18px", borderRadius: "14px", maxWidth: "75%", fontSize: "14px" }}>
                    <p style={{ margin: 0 }}>{m.content}</p>
                    
                    {/* Embedded Glucose Reading */}
                    {m.reading && (
                      <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(0,0,0,0.08)", borderRadius: "6px", borderLeft: "3px solid #3b82f6" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", display: "block" }}>📊 Patient Reading</span>
                        <strong style={{ fontSize: "15px" }}>{m.reading.valueMgDl} mg/dL</strong>
                        <small style={{ display: "block", fontSize: "10px", opacity: 0.85 }}>{m.reading.context} · {new Date(m.reading.recordedAt).toLocaleString()}</small>
                      </div>
                    )}

                    {/* Embedded Care Directive Card */}
                    {m.attachmentJson && (
                      <div style={{ marginTop: "8px", padding: "10px", background: "var(--bg-card)", border: "1px solid #3b82f6", borderRadius: "8px", color: "var(--text-main)" }}>
                        <span style={{ fontSize: "9px", fontWeight: "bold", background: "#3b82f6", color: "#fff", padding: "2px 5px", borderRadius: "4px" }}>PRESCRIPTION DIRECTIVE</span>
                        <small style={{ display: "block", fontSize: "11px", marginTop: "4px", color: "var(--text-muted)" }}>Issued to Patient Care Plan</small>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                      <small style={{ color: m.senderRole === "DOCTOR" ? "rgba(255,255,255,0.8)" : "var(--text-muted)", fontSize: "10px" }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                      {m.senderRole === "DOCTOR" && (
                        <small style={{ color: m.isRead ? "#a7f3d0" : "#d1fae5", fontSize: "10px", fontWeight: "bold" }}>{m.isRead ? "✓✓ Read" : "✓ Sent"}</small>
                      )}
                    </div>
                  </div>
                ))}
                {!messages.length && <p style={{ color: "var(--text-muted)", padding: "3rem", textAlign: "center" }}>No messages in this patient thread yet.</p>}
              </div>

              {/* AI Quick Response Chips */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "12px 0 8px" }}>
                <span style={{ fontSize: "11px", color: "var(--accent-primary)", fontWeight: "bold", alignSelf: "center" }}>✦ AI CHIPS:</span>
                <button type="button" onClick={() => setChatMessage("I reviewed your recent readings. Everything looks stable! Keep up your current routine.")} style={{ padding: "6px 10px", background: "var(--bg-subtle)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>"Everything looks stable!"</button>
                <button type="button" onClick={() => setChatMessage("I noticed a post-meal spike. Did you take your prescribed dosage with dinner?")} style={{ padding: "6px 10px", background: "var(--bg-subtle)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>"Did you take your dosage?"</button>
              </div>

              <form onSubmit={e => handleSendMessage(e)} style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" onClick={() => setIsDirectiveOpen(true)} style={{ padding: "0 14px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--accent-primary)", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>✚ Prescribe Directive</button>
                <input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a secure message to patient..." style={{ flex: 1, padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--text-main)", outline: "none", fontSize: "14px" }} />
                <button disabled={sendingMsg} className="submit" style={{ width: "auto", margin: 0, padding: "10px 20px" }}>{sendingMsg ? "Sending..." : "Send"}</button>
              </form>
            </div>
          </section>
        )}

        {activeTab === "reports" && (
          <section className="reports-tab" style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem 0", color: "var(--text-heading)" }}>Remote Patient Monitoring (RPM) Reports</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "1.5rem" }}>Generate billing compliance and clinical activity summaries for your panel.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "1.25rem" }}>
                <h3 style={{ fontSize: "15px", color: "var(--text-heading)", margin: "0 0 0.5rem 0" }}>Monthly RPM Summary (CPT 99454 / 99457)</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Exports 16+ reading transmission logs and clinical review time per patient.</p>
                <button onClick={() => alert("Report compiled! Download started.")} className="outline-button" style={{ marginTop: "1rem" }}>↓ Download PDF Report</button>
              </div>
              <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "1.25rem" }}>
                <h3 style={{ fontSize: "15px", color: "var(--text-heading)", margin: "0 0 0.5rem 0" }}>Glycemia Population Health Audit</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Overall TIR distribution, severe hypoglycemic event frequencies, and HbA1c estimates.</p>
                <button onClick={() => alert("CSV Audit Report exported.")} className="outline-button" style={{ marginTop: "1rem" }}>↓ Export CSV Data</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="settings-tab" style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem 0", color: "var(--text-heading)" }}>Clinic Practice & Threshold Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "450px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-main)" }}>Critical High Threshold (mg/dL)
                <input type="number" value={thresholds.criticalHigh} onChange={e => setThresholds({ ...thresholds, criticalHigh: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--text-main)", marginTop: "4px" }} />
              </label>
              <label style={{ fontSize: "13px", color: "var(--text-main)" }}>Severe Low Threshold (mg/dL)
                <input type="number" value={thresholds.severeLow} onChange={e => setThresholds({ ...thresholds, severeLow: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--text-main)", marginTop: "4px" }} />
              </label>
              <label style={{ fontSize: "13px", color: "var(--text-main)" }}>Target High Range (mg/dL)
                <input type="number" value={thresholds.targetHigh} onChange={e => setThresholds({ ...thresholds, targetHigh: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--text-main)", marginTop: "4px" }} />
              </label>
              {thresholdSaved && <span style={{ color: "var(--accent-primary)", fontSize: "13px" }}>Practice thresholds saved successfully!</span>}
              <button onClick={() => { setThresholdSaved(true); setTimeout(() => setThresholdSaved(false), 3000); }} className="submit" style={{ width: "fit-content", padding: "10px 18px", marginTop: "0.5rem" }}>Save Threshold Rules</button>
            </div>
          </section>
        )}
      </section>

      {/* Prescribe Care Directive Modal */}
      {isDirectiveOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: "420px" }}>
            <button type="button" className="close" onClick={() => setIsDirectiveOpen(false)}>×</button>
            <p className="eyebrow" style={{ marginTop: "4px" }}>CLINICAL CARE DIRECTIVE</p>
            <h2>Issue Prescription Update</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>Send an interactive care plan directive for patient acceptance.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "bold" }}>Medication Name
                <input value={directiveMed} onChange={e => setDirectiveMed(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--text-main)", marginTop: "4px" }} />
              </label>
              <label style={{ fontSize: "13px", fontWeight: "bold" }}>New Target Dosage
                <input value={directiveDose} onChange={e => setDirectiveDose(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-subtle)", color: "var(--text-main)", marginTop: "4px" }} />
              </label>
              <button onClick={sendCareDirective} className="submit" style={{ marginTop: "8px" }}>Send Care Directive Card</button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleAddPatient}>
            <button type="button" className="close" onClick={() => setIsAddOpen(false)}>×</button>
            <p className="eyebrow" style={{ marginTop: "4px" }}>ONBOARDING</p>
            <h2>Assign Patient</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "1.5rem" }}>Enter the registered email of the patient to add them to your care panel.</p>
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
    <article className="patient-row" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderBottom: "1px solid var(--border-color)" }}>
      <div className={`patient-initials ${band}`}>{p.initials}</div>
      <div className="patient-name" style={{ flex: 1 }}>
        <b style={{ color: "var(--text-heading)", fontSize: "14px", display: "block" }}>{p.name}</b>
        <small style={{ color: "var(--text-muted)", fontSize: "11px", display: "block", marginTop: "2px" }}>
          {p.lastLoggedHoursAgo === 999 ? "Last reading never" : `Last reading ${p.lastLoggedHoursAgo}h ago`}
        </small>
      </div>
      <div className="patient-reading" style={{ textAlign: "right", marginRight: "12px" }}>
        <b style={{ color: "var(--text-heading)", fontSize: "14px" }}>{p.lastReading ? `${p.lastReading}` : "—"}</b>
        <small style={{ color: "var(--text-muted)", fontSize: "11px", marginLeft: "3px" }}>mg/dL</small>
      </div>
      <span className={`risk ${band}`} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {band === "critical" ? "Urgent" : band === "attention" ? "Review" : "Stable"}
      </span>
    </article>
  );
}
