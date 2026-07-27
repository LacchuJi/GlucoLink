"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { analytics, buildChartPoints, trend } from "@/features/glucose/analytics";
import { type GlucoseReading, type MealContext } from "@/features/glucose/types";
import { ClinicianDashboard } from "@/features/clinical/clinician-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/profile-menu";
import { NotificationToast } from "@/components/notification-toast";

const contextNames: Record<MealContext, string> = {
  FASTING: "Fasting",
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal",
  BEDTIME: "Bedtime",
  RANDOM: "Random"
};

type ApiMessage = {
  id: string;
  senderId: string;
  senderRole: "PATIENT" | "DOCTOR";
  content: string;
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
  reading?: {
    valueMgDl: number;
    context: MealContext;
    recordedAt: string;
  } | null;
  attachmentJson?: string | null;
};

export function Dashboard() {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"patient" | "clinical">("patient");
  const [activeTab, setActiveTab] = useState<"overview" | "readings" | "history" | "careplan" | "messages" | "devices" | "settings">("overview");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [filterContext, setFilterContext] = useState<string>("ALL");

  // Medication adherence state
  const [meds, setMeds] = useState([
    { id: "1", name: "Metformin", dosage: "500 mg", timing: "With dinner (8:00 PM)", taken: false },
    { id: "2", name: "Insulin Lispro", dosage: "4 units", timing: "Before breakfast (8:00 AM)", taken: true }
  ]);

  // DB-synced messaging state
  const [patientMsg, setPatientMsg] = useState("");
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string; sender: string } | null>(null);
  
  const lastMsgCountRef = useRef<number>(0);

  // Attachment Modal
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [selectedReadingForAttach, setSelectedReadingForAttach] = useState<string | null>(null);

  const stats = useMemo(() => analytics(readings), [readings]);
  const current = readings.at(-1);
  const currentTrend = trend(readings);

  // Fetch readings
  useEffect(() => {
    fetch("/api/readings")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = await response.json();
        setReadings(
          payload.readings.reverse().map((r: { id: string; valueMgDl: number; recordedAt: string; context: MealContext; source: GlucoseReading["source"]; verifiedAt: string | null }) => ({
            id: r.id,
            value: r.valueMgDl,
            recordedAt: r.recordedAt,
            context: r.context,
            source: r.source,
            verified: Boolean(r.verifiedAt)
          }))
        );
      })
      .catch(() => setReadings([]))
      .finally(() => setLoading(false));
  }, []);

  // Continuous Fast Sync Engine (1500ms)
  const fetchMessages = () => {
    fetch("/api/clinical/messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          const newMsgs: ApiMessage[] = data.messages;
          if (lastMsgCountRef.current > 0 && newMsgs.length > lastMsgCountRef.current) {
            const latest = newMsgs[newMsgs.length - 1];
            if (latest && latest.senderRole === "DOCTOR") {
              setActiveToast({
                title: "New Message Received",
                message: latest.content,
                sender: "Dr. Sarah Adams"
              });
            }
          }
          lastMsgCountRef.current = newMsgs.length;
          setMessages(newMsgs);
        }
        if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = Number(form.get("value"));
    setSaveError("");
    if (!Number.isInteger(value) || value < 20 || value > 700) return;

    const response = await fetch("/api/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value, context: form.get("context"), source: "MANUAL", recordedAt: new Date().toISOString() })
    });

    if (!response.ok) {
      try {
        const { error } = await response.json();
        setSaveError(error || "Failed to save reading");
      } catch {
        setSaveError("Failed to save reading");
      }
      return;
    }

    const { reading } = await response.json();
    setReadings((prev) => [
      ...prev,
      { id: reading.id, value: reading.valueMgDl, context: reading.context, source: reading.source, verified: Boolean(reading.verifiedAt), recordedAt: reading.recordedAt }
    ]);
    setOpen(false);
  }

  async function handleSendPatientMsg(e: FormEvent) {
    e.preventDefault();
    if ((!patientMsg.trim() && !selectedReadingForAttach) || sendingMsg) return;
    setSendingMsg(true);
    try {
      const payload: { content: string; readingId?: string } = {
        content: patientMsg.trim() || "Attached blood glucose reading for review."
      };
      if (selectedReadingForAttach) payload.readingId = selectedReadingForAttach;

      const res = await fetch("/api/clinical/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        lastMsgCountRef.current += 1;
        setPatientMsg("");
        setSelectedReadingForAttach(null);
        setIsAttachOpen(false);
      }
    } catch (err) {
      console.error("Failed to send chat message:", err);
    } finally {
      setSendingMsg(false);
    }
  }

  function handleAcceptDirective(attachmentJson: string) {
    try {
      const directive = JSON.parse(attachmentJson);
      if (directive.medicationName && directive.newDosage) {
        setMeds(prev => [
          ...prev.filter(m => m.name !== directive.medicationName),
          {
            id: String(Date.now()),
            name: directive.medicationName,
            dosage: directive.newDosage,
            timing: directive.timing || "Prescribed by Doctor",
            taken: false
          }
        ]);
        alert(`Accepted directive: Updated ${directive.medicationName} to ${directive.newDosage}`);
      }
    } catch {
      alert("Care directive accepted.");
    }
  }

  if (loading) return <main className="loading-screen">Loading your secure health record…</main>;
  if (mode === "clinical") return <ClinicianDashboard onToggleMode={() => setMode("patient")} />;

  const filteredReadings = readings.filter(r => filterContext === "ALL" || r.context === filterContext);

  return (
    <main className="shell">
      {activeToast && (
        <NotificationToast
          title={activeToast.title}
          message={activeToast.message}
          sender={activeToast.sender}
          onAction={() => setActiveTab("messages")}
          onClose={() => setActiveToast(null)}
        />
      )}

      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">G</span><span>Gluco<span>Link</span></span></div>
        <div className="workspace"><span className="avatar">SA</span><div><b>Sarah Adams</b><small>Patient workspace</small></div></div>
        <nav>
          <a className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")} style={{ cursor: "pointer" }}>⌂ <span>Overview</span></a>
          <a className={activeTab === "readings" ? "active" : ""} onClick={() => setActiveTab("readings")} style={{ cursor: "pointer" }}>▣ <span>My readings</span></a>
          <a className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")} style={{ cursor: "pointer" }}>◴ <span>History</span></a>
          <a className={activeTab === "careplan" ? "active" : ""} onClick={() => setActiveTab("careplan")} style={{ cursor: "pointer" }}>♡ <span>Care plan</span></a>
          <a className={activeTab === "messages" ? "active" : ""} onClick={() => setActiveTab("messages")} style={{ cursor: "pointer" }}>▤ <span>Messages</span>{unreadCount > 0 ? <i>{unreadCount}</i> : <b>{messages.length}</b>}</a>
          <a className={activeTab === "devices" ? "active" : ""} onClick={() => setActiveTab("devices")} style={{ cursor: "pointer" }}>◌ <span>Devices</span></a>
        </nav>
        <div className="side-bottom">
          <a className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")} style={{ cursor: "pointer" }}>⚙ <span>Settings</span></a>
          <button className="mode" onClick={() => setMode(mode === "patient" ? "clinical" : "patient")}>⇄ {mode === "patient" ? "Clinician preview" : "Patient preview"}</button>
          <p>© 2026 GlucoLink<br />Privacy & security</p>
        </div>
      </aside>

      <section className="content">
        <header>
          <div>
            <p className="eyebrow">YOUR SECURE HEALTH RECORD</p>
            <h1>{activeTab === "overview" ? "Welcome back ✦" : activeTab === "readings" ? "My Readings Log" : activeTab === "history" ? "Glucose History & Trends" : activeTab === "careplan" ? "Care Plan & Medications" : activeTab === "messages" ? "Care Team Telehealth Messages" : activeTab === "devices" ? "Connected Devices & Sync" : "Account & App Settings"}</h1>
            <p className="sub">{activeTab === "overview" ? "Here’s how your glucose is looking today." : activeTab === "readings" ? "View and manage all recorded blood sugar values." : activeTab === "history" ? "Analyze historical patterns and time in range." : activeTab === "careplan" ? "Track your daily prescribed medication regimen." : activeTab === "messages" ? "Communicate securely with your care provider." : activeTab === "devices" ? "Manage synced glucose meters and Health Connect integration." : "Manage your target ranges and personal details."}</p>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <button className="icon-btn" onClick={() => setActiveTab("messages")} aria-label="Notifications" style={{ cursor: "pointer" }}>
              ♧{unreadCount > 0 && <b style={{ background: "#ef4444" }}></b>}
            </button>
            <ProfileMenu defaultInitials="SA" />
          </div>
        </header>

        {activeTab === "overview" && (
          <>
            <section className="hero-grid">
              <article className="glucose-card">
                <div className="card-top">
                  <div>
                    <p className="label">CURRENT GLUCOSE</p>
                    <div className="reading"><strong>{current?.value ?? "—"}</strong><span>mg/dL</span></div>
                    <span className="status good">● {current ? "Recorded" : "No reading yet"}</span>
                  </div>
                  <div className="trend">
                    <span className={currentTrend}>↗</span>
                    <small>Since last reading</small>
                    <b>{readings.length > 1 ? "Trend available" : "Log two readings"}</b>
                  </div>
                </div>
                <div className="range">
                  <div className="range-track"><span></span><i></i></div>
                  <div><small>70</small><small>Target range 70–180</small><small>180</small></div>
                </div>
                <p className="reading-note">{current ? `Last recorded ${new Date(current.recordedAt).toLocaleString()}` : "Log your first glucose reading to get started."}</p>
              </article>
              <article className="quick-card">
                <div>
                  <p className="label">QUICK ACTIONS</p>
                  <h2>Keep your care team in the loop.</h2>
                </div>
                <div className="quick-actions">
                  <button onClick={() => { setOpen(true); setSaveError(""); }}><span>＋</span> Log reading</button>
                  <button onClick={() => setActiveTab("devices")}><span>⇣</span> Import device</button>
                  <button onClick={() => setActiveTab("messages")}><span>▣</span> Message care team</button>
                </div>
              </article>
            </section>

            <section className="section-heading">
              <div><h2>Glucose overview</h2><p>Your readings over the last 7 days</p></div>
              <button className="select">Last 7 days⌄</button>
            </section>

            <article className="chart-card">
              <div className="chart-meta">
                <div><b>{stats.average || "—"} <small>mg/dL</small></b><span>Average from saved readings</span></div>
                <div className="legend"><i></i> In range <em></em> Above range</div>
              </div>
              <div className="chart">
                <div className="target-zone"></div>
                {readings.length ? (
                  <svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-label="Glucose line chart">
                    <defs>
                      <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                        <stop stopColor="#44c59a" stopOpacity="0.22" />
                        <stop offset="1" stopColor="#44c59a" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`${buildChartPoints(readings)} 600,170 0,170`} fill="url(#fill)" />
                    <polyline points={buildChartPoints(readings)} fill="none" stroke="#24a77c" strokeWidth="3" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <p className="empty-chart">Your saved readings will appear here.</p>
                )}
                <div className="axis"><span>Earlier</span><span>Today</span></div>
              </div>
            </article>

            <section className="metrics">
              <Metric label="TIME IN RANGE" value={`${stats.tir}%`} note="Above your 70% goal" tone="green" />
              <Metric label="ESTIMATED A1C" value={`${stats.a1c}%`} note="Based on recent readings" tone="blue" />
              <Metric label="HIGH EVENTS" value={stats.highEvents.toString()} note="No events in the last 24h" tone="amber" />
              <Metric label="VARIABILITY" value={`${stats.cv}%`} note="Target is below 36%" tone="purple" />
            </section>

            <section className="lower-grid">
              <article className="list-card">
                <div className="card-title">
                  <div><h2>Recent readings</h2><p>{Math.min(4, readings.length)} readings shown</p></div>
                  <button onClick={() => setActiveTab("readings")}>View history →</button>
                </div>
                {readings.slice(-4).reverse().map((r) => (
                  <div className="reading-row" key={r.id}>
                    <span className="reading-dot"></span>
                    <div><b>{contextNames[r.context]}</b><small>{new Date(r.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {r.source === "DEVICE_IMPORT" ? "Device import" : "Manual"}</small></div>
                    <strong>{r.value} <small>mg/dL</small></strong>
                  </div>
                ))}
              </article>
              <article className="care-card">
                <div className="care-top"><span className="pill">NEXT UP</span><button onClick={() => setActiveTab("careplan")}>•••</button></div>
                <h2>Evening Metformin</h2>
                <p>500 mg · Take with dinner</p>
                <div className="care-footer">
                  <span>◷ Scheduled for 8:00 PM</span>
                  <button onClick={() => setMeds(meds.map(m => m.id === "1" ? { ...m, taken: !m.taken } : m))}>{meds.find(m => m.id === "1")?.taken ? "Taken ✓" : "Mark taken"}</button>
                </div>
              </article>
            </section>
          </>
        )}

        {activeTab === "readings" && (
          <section className="list-card" style={{ padding: "24px" }}>
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2>All Glucose Readings ({readings.length})</h2>
                <p>Complete historical log of all entries</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <select value={filterContext} onChange={e => setFilterContext(e.target.value)} className="select" style={{ padding: "6px 12px" }}>
                  <option value="ALL">All Contexts</option>
                  <option value="FASTING">Fasting</option>
                  <option value="BEFORE_MEAL">Before Meal</option>
                  <option value="AFTER_MEAL">After Meal</option>
                  <option value="BEDTIME">Bedtime</option>
                  <option value="RANDOM">Random</option>
                </select>
                <button onClick={() => setOpen(true)} className="submit" style={{ padding: "6px 14px" }}>＋ Log Reading</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredReadings.slice().reverse().map((r) => (
                <div className="reading-row" key={r.id} style={{ padding: "14px", background: "#f8faf9", borderRadius: "10px", border: "1px solid #e9efec" }}>
                  <span className="reading-dot" style={{ background: r.value > 180 ? "#efb957" : r.value < 70 ? "#ef625e" : "#24a77c" }}></span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: "14px" }}>{contextNames[r.context]}</b>
                    <small style={{ color: "#77847e" }}>{new Date(r.recordedAt).toLocaleString()} · {r.source === "DEVICE_IMPORT" ? "Device Sync" : "Manual Log"}</small>
                  </div>
                  <strong style={{ fontSize: "18px", color: r.value > 180 ? "#d97706" : r.value < 70 ? "#dc2626" : "#059669" }}>
                    {r.value} <small style={{ fontSize: "12px", color: "#6b7280" }}>mg/dL</small>
                  </strong>
                </div>
              ))}
              {!filteredReadings.length && <p style={{ color: "#88928e", padding: "30px", textAlign: "center" }}>No readings found matching filter.</p>}
            </div>
          </section>
        )}

        {activeTab === "history" && (
          <section className="history-tab">
            <article className="chart-card" style={{ padding: "24px", marginBottom: "20px" }}>
              <h2>7-Day Glucose Trend Analysis</h2>
              <p style={{ color: "#78847f", fontSize: "13px", marginBottom: "16px" }}>Detailed breakdown of glycemic stability and daily averages</p>
              <div className="chart" style={{ height: "200px" }}>
                <div className="target-zone"></div>
                {readings.length ? (
                  <svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-label="Glucose line chart">
                    <polygon points={`${buildChartPoints(readings)} 600,170 0,170`} fill="url(#fill)" />
                    <polyline points={buildChartPoints(readings)} fill="none" stroke="#24a77c" strokeWidth="3" />
                  </svg>
                ) : (
                  <p className="empty-chart">No readings logged yet.</p>
                )}
              </div>
            </article>

            <section className="metrics">
              <Metric label="AVERAGE GLUCOSE" value={`${stats.average || "—"} mg/dL`} note="Target: 70-140 mg/dL" tone="green" />
              <Metric label="TIME IN RANGE" value={`${stats.tir}%`} note="Target: >70%" tone="blue" />
              <Metric label="ESTIMATED A1C" value={`${stats.a1c}%`} note="Estimated 90-day" tone="purple" />
              <Metric label="VARIABILITY" value={`${stats.cv}%`} note="Target: <36%" tone="amber" />
            </section>
          </section>
        )}

        {activeTab === "careplan" && (
          <section className="careplan-tab" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <article className="care-card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "20px", marginBottom: "10px" }}>Prescribed Medications & Regimen</h2>
              <p style={{ color: "#78847f", fontSize: "14px", marginBottom: "20px" }}>Your care provider’s active prescription plan for glucose management.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {meds.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#fff", border: "1px solid #e9efec", borderRadius: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "16px", color: "#16251f" }}>{m.name} ({m.dosage})</strong>
                      <small style={{ display: "block", color: "#78847f", marginTop: "3px" }}>{m.timing}</small>
                    </div>
                    <button onClick={() => setMeds(meds.map(item => item.id === m.id ? { ...item, taken: !item.taken } : item))} style={{ padding: "8px 16px", borderRadius: "8px", background: m.taken ? "#e6f7f0" : "#188e69", color: m.taken ? "#117858" : "#fff", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                      {m.taken ? "Completed ✓" : "Mark Taken"}
                    </button>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeTab === "messages" && (
          <section className="messages-tab" style={{ background: "#fff", border: "1px solid #e9efec", borderRadius: "17px", padding: "24px", minHeight: "450px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", margin: 0 }}>Care Team Telehealth Messages</h2>
                <span style={{ fontSize: "12px", color: "#188e69", background: "#e6f7f0", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold" }}>● Realtime Fast Sync (1.5s)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "340px", overflowY: "auto", paddingRight: "4px" }}>
                {messages.map(m => (
                  <div key={m.id} style={{ alignSelf: m.senderRole === "PATIENT" ? "flex-end" : "flex-start", background: m.senderRole === "PATIENT" ? "#188e69" : "#f4f8f6", color: m.senderRole === "PATIENT" ? "#fff" : "#182521", padding: "14px 18px", borderRadius: "14px", maxWidth: "75%", fontSize: "14px" }}>
                    <p style={{ margin: 0 }}>{m.content}</p>
                    
                    {/* Embedded Glucose Attachment */}
                    {m.reading && (
                      <div style={{ marginTop: "10px", padding: "10px 12px", background: "rgba(0,0,0,0.06)", borderRadius: "8px", borderLeft: "3px solid #24a77c" }}>
                        <strong style={{ display: "block", fontSize: "13px" }}>📊 Attached Glucose Reading</strong>
                        <span style={{ fontSize: "15px", fontWeight: "bold" }}>{m.reading.valueMgDl} mg/dL</span>
                        <small style={{ display: "block", fontSize: "10px", opacity: 0.85 }}>{contextNames[m.reading.context]} · {new Date(m.reading.recordedAt).toLocaleString()}</small>
                      </div>
                    )}

                    {/* Embedded Care Directive Action Card */}
                    {m.attachmentJson && (
                      <div style={{ marginTop: "10px", padding: "12px", background: "#fff", border: "1px solid #3b82f6", borderRadius: "10px", color: "#1e293b" }}>
                        <span style={{ fontSize: "10px", fontWeight: "bold", background: "#dbeafe", color: "#1d4ed8", padding: "2px 6px", borderRadius: "4px" }}>CARE DIRECTIVE</span>
                        <h4 style={{ margin: "6px 0 4px", fontSize: "14px" }}>Prescription & Care Plan Adjustment</h4>
                        <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 10px 0" }}>Your doctor issued a care regimen update.</p>
                        <button onClick={() => handleAcceptDirective(m.attachmentJson!)} style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>Accept & Update Care Plan ✓</button>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                      <small style={{ color: m.senderRole === "PATIENT" ? "#b7e3d4" : "#75817d", fontSize: "10px" }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                      {m.senderRole === "PATIENT" && (
                        <small style={{ color: m.isRead ? "#6EE7B7" : "#b7e3d4", fontSize: "10px", fontWeight: "bold" }}>{m.isRead ? "✓✓ Read" : "✓ Sent"}</small>
                      )}
                    </div>
                  </div>
                ))}
                {!messages.length && <p style={{ color: "#888", padding: "2rem", textAlign: "center" }}>No messages yet. Send a message or attach a reading below!</p>}
              </div>
            </div>

            <form onSubmit={handleSendPatientMsg} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
              {selectedReadingForAttach && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#e6f7f0", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", color: "#117858" }}>
                  <span>📎 Attached Reading: <strong>{readings.find(r => r.id === selectedReadingForAttach)?.value} mg/dL</strong></span>
                  <button type="button" onClick={() => setSelectedReadingForAttach(null)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#dc2626", fontWeight: "bold" }}>×</button>
                </div>
              )}
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setIsAttachOpen(true)} style={{ padding: "0 14px", borderRadius: "9px", border: "1px solid #dce5e0", background: "#f4f8f6", color: "#53635d", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>📎 Attach Glucose</button>
                <input value={patientMsg} onChange={e => setPatientMsg(e.target.value)} placeholder="Type a message to your clinical care team..." style={{ flex: 1, padding: "12px 16px", borderRadius: "9px", border: "1px solid #dce5e0", outline: "none", fontSize: "14px" }} />
                <button disabled={sendingMsg} className="submit" style={{ width: "auto", margin: 0, padding: "0 24px" }}>{sendingMsg ? "Sending..." : "Send"}</button>
              </div>
            </form>
          </section>
        )}

        {activeTab === "devices" && (
          <section className="devices-tab" style={{ background: "#fff", border: "1px solid #e9efec", borderRadius: "17px", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Connected Devices & Integrations</h2>
            <p style={{ color: "#78847f", fontSize: "14px", marginBottom: "20px" }}>Automatically import blood sugar readings from supported glucometers.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ border: "1px solid #e9efec", borderRadius: "12px", padding: "18px", background: "#f8faf9" }}>
                <strong style={{ fontSize: "15px", display: "block" }}>Android Health Connect</strong>
                <small style={{ color: "#78847f", display: "block", marginTop: "4px" }}>Sync readings automatically from Google Health Connect.</small>
                <button onClick={() => alert("Health Connect sync initiated.")} style={{ marginTop: "12px", padding: "8px 14px", background: "#188e69", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Connect Sync</button>
              </div>
              <div style={{ border: "1px solid #e9efec", borderRadius: "12px", padding: "18px", background: "#f8faf9" }}>
                <strong style={{ fontSize: "15px", display: "block" }}>Manual & OCR Import</strong>
                <small style={{ color: "#78847f", display: "block", marginTop: "4px" }}>Snap a photo of your meter screen to auto-read glucose value.</small>
                <button onClick={() => alert("OCR scanner opening...")} style={{ marginTop: "12px", padding: "8px 14px", background: "#f4f8f6", color: "#182521", border: "1px solid #dce5e0", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>Scan Meter Screen</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="settings-tab" style={{ background: "#fff", border: "1px solid #e9efec", borderRadius: "17px", padding: "24px" }}>
            <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Patient Profile & Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "450px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#182521" }}>Target Low Range (mg/dL)
                <input type="number" defaultValue="70" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dce5e0", marginTop: "6px" }} />
              </label>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#182521" }}>Target High Range (mg/dL)
                <input type="number" defaultValue="180" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dce5e0", marginTop: "6px" }} />
              </label>
              <button onClick={() => alert("Settings saved.")} className="submit" style={{ width: "fit-content", padding: "10px 20px" }}>Save Preferences</button>
            </div>
          </section>
        )}
      </section>

      {/* Attach Reading Modal */}
      {isAttachOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: "420px" }}>
            <button type="button" className="close" onClick={() => setIsAttachOpen(false)}>×</button>
            <p className="eyebrow">TELEHEALTH ATTACHMENT</p>
            <h2>Select Glucose Reading</h2>
            <p style={{ color: "#78847f", fontSize: "13px", marginBottom: "16px" }}>Choose a reading entry to share with your care team in chat.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
              {readings.slice(-6).reverse().map((r) => (
                <div key={r.id} onClick={() => { setSelectedReadingForAttach(r.id); setIsAttachOpen(false); }} style={{ padding: "10px 14px", background: selectedReadingForAttach === r.id ? "#e6f7f0" : "#f8faf9", border: "1px solid #e9efec", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "14px" }}>{r.value} mg/dL</strong>
                    <small style={{ display: "block", color: "#78847f", fontSize: "11px" }}>{contextNames[r.context]}</small>
                  </div>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>{new Date(r.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={save}>
            <button type="button" className="close" onClick={() => setOpen(false)}>×</button>
            <p className="eyebrow">NEW READING</p>
            <h2>Log blood glucose</h2>
            <label>Glucose value
              <div className="input-wrap">
                <input name="value" required type="number" min="20" max="700" autoFocus />
                <span>mg/dL</span>
              </div>
            </label>
            <label>When was this taken?
              <select name="context" defaultValue="BEFORE_MEAL">
                {Object.entries(contextNames).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            {saveError && <p style={{ color: "red", fontSize: "13px" }}>{saveError}</p>}
            <button className="submit">Save reading</button>
            <p className="disclaimer">This is for tracking and care coordination, not emergency guidance.</p>
          </form>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return (
    <article className="metric">
      <div className={`metric-icon ${tone}`}>⌁</div>
      <p className="label">{label}</p>
      <b>{value}</b>
      <span>{note}</span>
    </article>
  );
}
