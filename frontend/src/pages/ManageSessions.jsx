import { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Activity, Trash2, Mail } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { useSessions } from "../hooks/useSessions";
import useCopilotStore from "../store/useCopilotStore";

export default function ManageSessions() {
  const { dept_id } = useParams();

  // Consume sessions hook
  const { sessions, loadSessions } = useSessions(dept_id);

  // Local state for session management
  const [sessionId, setSessionId] = useState("");
  const [sem, setSem] = useState("");
  const [section, setSection] = useState("");
  const [trackSessionId, setTrackSessionId] = useState(null);
  const [trackData, setTrackData] = useState([]);
  const [notifying, setNotifying] = useState(null);

  // Copilot Integration
  const { uiIntent, setUiIntent } = useCopilotStore();
  
  useEffect(() => {
    if (uiIntent && uiIntent.action === "create_session") {
      setSem(uiIntent.sem);
      setSection(uiIntent.section);
      if (!sessionId) {
        generateSessionId();
      }
      setUiIntent(null); // Clear intent after consuming
    }
  }, [uiIntent, sessionId, setUiIntent]);

  // Handlers
  const generateSessionId = () => {
    const id = "S" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionId(id);
  };

  const createSession = async () => {
    if (!sessionId.trim() || !sem || !section.trim()) return toast.error("All fields required");
    try {
      await apiClient.post("/create-session", { 
        session_id: sessionId.trim(), 
        dept_id, 
        sem: parseInt(sem, 10), 
        section: section.trim().toUpperCase() 
      }, { withCredentials: true });
      toast.success("Session Created");
      setSessionId(""); setSem(""); setSection("");
      loadSessions();
    } catch (err) { 
      toast.error(err.response?.data?.error || "Error creating session"); 
    }
  };

  const deleteSession = async (session_id) => {
    if (!window.confirm("Delete this session?")) return;
    try {
      await apiClient.delete(`/delete-session/${session_id}`, { withCredentials: true });
      toast.success("Session deleted");
      loadSessions();
    } catch (err) { toast.error("Error deleting session"); }
  };

  const handleTrackSession = async (session_id) => {
    try {
      const res = await apiClient.get(`/track-session/${session_id}`, { withCredentials: true });
      setTrackData(res.data);
      setTrackSessionId(session_id);
    } catch(err) { toast.error("Error tracking session"); }
  };

  const handleNotifyStudents = async (session_id) => {
    setNotifying(session_id);
    try {
      const res = await apiClient.post(`/sessions/${session_id}/notify`, {}, { withCredentials: true });
      toast.success(res.data.message || "Emails sent successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send emails.");
    } finally {
      setNotifying(null);
    }
  };

  return (
    <PageTransition>
      <div className="flex-col" style={{ width: "100%", animation: "fadeIn 0.3s" }}>
        
        {/* RESPONSIVE STYLES FOR SESSION MANAGEMENT */}
        <style>
          {`
            .session-form-card {
              padding: 24px;
              margin-bottom: 24px;
            }
            .session-form-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 16px;
              align-items: flex-end;
              width: 100%;
            }
            .session-field-id {
              flex: 1 1 240px;
            }
            .session-field-semsec {
              display: flex;
              gap: 14px;
              flex: 1 1 240px;
            }
            .session-field-semsec > div {
              flex: 1;
            }
            .session-field-submit {
              flex: 1 1 180px;
            }
            .session-submit-btn {
              padding: 10px 24px;
              height: 42px;
              width: 100%;
              background: var(--focus-ring);
              color: var(--primary);
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              font-weight: 600;
              font-size: 13.5px;
              white-space: nowrap;
            }
            .session-gen-btn {
              padding: 10px 16px;
              font-size: 13px;
              background: #f1f5f9;
              color: var(--navy);
              font-weight: 600;
              border-radius: var(--radius-btn);
            }

            .session-desktop-view {
              display: block;
            }
            .session-mobile-view {
              display: none;
            }

            .session-card-mobile {
              background: var(--card-bg);
              border: 1px solid var(--border-color);
              border-radius: 14px;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              box-shadow: var(--shadow-soft);
              transition: transform 0.2s ease;
            }

            @media (max-width: 768px) {
              .session-form-card {
                padding: 16px 14px !important;
                margin-bottom: 16px !important;
              }
              .session-form-grid {
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                align-items: stretch !important;
              }
              .session-field-id {
                width: 100% !important;
                flex: none !important;
              }
              .session-field-semsec {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 10px !important;
                width: 100% !important;
                flex: none !important;
              }
              .session-field-submit {
                width: 100% !important;
                flex: none !important;
                margin-top: 4px;
              }
              .session-submit-btn {
                width: 100% !important;
                height: 42px !important;
              }

              .session-desktop-view {
                display: none !important;
              }
              .session-mobile-view {
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
              }
            }
          `}
        </style>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px", padding: "4px 0" }}>
          <div>
            <h2 className="title-large text-gradient" style={{ margin: 0 }}>Session Management</h2>
            <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0" }}>Create new feedback sessions and monitor active ones.</p>
          </div>
        </div>

        {/* INLINE CREATE SESSION PANEL */}
        <div className="card session-form-card">
          <div className="session-form-grid">
            
            {/* Session ID */}
            <div className="session-field-id flex-col gap-sm">
              <label className="field-label" style={{ fontSize: "13px" }}>Session ID</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="text" className="form-input" style={{ padding: "10px", flex: 1 }} placeholder="e.g. S4X92" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
                <button className="btn session-gen-btn" onClick={generateSessionId}>Gen</button>
              </div>
            </div>

            {/* Sem & Sec Grouped */}
            <div className="session-field-semsec">
              <div className="flex-col gap-sm">
                <label className="field-label" style={{ fontSize: "13px" }}>Semester</label>
                <input type="number" className="form-input" style={{ padding: "10px" }} placeholder="1-8" value={sem} onChange={(e) => setSem(e.target.value)} />
              </div>
              <div className="flex-col gap-sm">
                <label className="field-label" style={{ fontSize: "13px" }}>Section</label>
                <input type="text" className="form-input" style={{ padding: "10px" }} placeholder="A/B/C" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} />
              </div>
            </div>

            {/* Submit Button */}
            <div className="session-field-submit">
              <button 
                className="btn hoverable session-submit-btn" 
                onClick={createSession}
              >
                <Plus size={16} strokeWidth={2.5} /> Create Session
              </button>
            </div>
            
          </div>
        </div>
        
        {/* SESSIONS LIST */}
        {sessions.length === 0 ? (
          <div className="card" style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-secondary)" }}>
            <Activity size={36} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: "10px" }} />
            <h4 style={{ margin: "0 0 4px 0", color: "var(--text-primary)", fontSize: "15px" }}>No Active Sessions</h4>
            <p style={{ margin: 0, fontSize: "13px" }}>Create a new feedback session above to begin receiving student responses.</p>
          </div>
        ) : (
          <>
            {/* 1. DESKTOP TABLE VIEW (Visible on >= 769px) */}
            <div className="session-desktop-view">
              <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
                    <thead style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-light)" }}>
                      <tr>
                        <th style={{ padding: "16px", color: "var(--text-secondary)", fontWeight: "600", whiteSpace: "nowrap" }}>Session ID</th>
                        <th style={{ padding: "16px", color: "var(--text-secondary)", fontWeight: "600", whiteSpace: "nowrap" }}>Sem/Sec</th>
                        <th style={{ padding: "16px", color: "var(--text-secondary)", fontWeight: "600", whiteSpace: "nowrap" }}>Status</th>
                        <th style={{ padding: "16px", color: "var(--text-secondary)", fontWeight: "600", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.session_id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }} className="hoverable">
                          <td style={{ padding: "16px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{s.session_id}</td>
                          <td style={{ padding: "16px", whiteSpace: "nowrap" }}>Sem {s.sem} | Sec {s.section}</td>
                          <td style={{ padding: "16px", whiteSpace: "nowrap" }}>
                            <span style={{ 
                              background: s.status === 'active' ? '#DCFCE7' : '#F3F4F6', 
                              color: s.status === 'active' ? '#166534' : '#374151',
                              padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600"
                            }}>
                              {s.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button className="btn hoverable" style={{ height: "36px", padding: "0 16px", fontSize: "13px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => handleNotifyStudents(s.session_id)} disabled={notifying === s.session_id}>
                                <Mail size={14} /> {notifying === s.session_id ? 'Sending...' : 'Email'}
                              </button>
                              <button className="btn btn-track hoverable" style={{ height: "36px", padding: "0 16px", fontSize: "13px", borderRadius: "8px" }} onClick={() => handleTrackSession(s.session_id)}>
                                <Activity size={14} /> Track
                              </button>
                              <button className="btn btn-delete hoverable" style={{ height: "36px", padding: "0 16px", fontSize: "13px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => deleteSession(s.session_id)}>
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 2. MOBILE CARD VIEW (Visible on < 768px - Touch-optimized Native Card Layout) */}
            <div className="session-mobile-view">
              {sessions.map((s) => (
                <div key={s.session_id} className="session-card-mobile hoverable">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary)", letterSpacing: "0.5px", fontFamily: "monospace" }}>
                        {s.session_id}
                      </span>
                      <span style={{ 
                        fontSize: "12px", 
                        color: "var(--text-secondary)", 
                        background: "var(--bg-light)", 
                        padding: "3px 8px", 
                        borderRadius: "6px",
                        fontWeight: "600",
                        border: "1px solid var(--border-color)"
                      }}>
                        Sem {s.sem} • Sec {s.section}
                      </span>
                    </div>
                    <span style={{ 
                      background: s.status === 'active' ? '#DCFCE7' : '#F3F4F6', 
                      color: s.status === 'active' ? '#166534' : '#374151',
                      padding: "4px 10px", 
                      borderRadius: "12px", 
                      fontSize: "11px", 
                      fontWeight: "700",
                      textTransform: "uppercase"
                    }}>
                      {s.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                    <button 
                      className="btn hoverable" 
                      style={{ 
                        height: "36px", 
                        padding: "0 6px", 
                        fontSize: "12px", 
                        borderRadius: "8px", 
                        border: "1px solid var(--border-color)", 
                        background: "transparent", 
                        color: "var(--primary)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "4px",
                        fontWeight: "600"
                      }} 
                      onClick={() => handleNotifyStudents(s.session_id)} 
                      disabled={notifying === s.session_id}
                    >
                      <Mail size={13} /> {notifying === s.session_id ? '...' : 'Email'}
                    </button>
                    <button 
                      className="btn btn-track hoverable" 
                      style={{ 
                        height: "36px", 
                        padding: "0 6px", 
                        fontSize: "12px", 
                        borderRadius: "8px",
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "4px",
                        fontWeight: "600"
                      }} 
                      onClick={() => handleTrackSession(s.session_id)}
                    >
                      <Activity size={13} /> Track
                    </button>
                    <button 
                      className="btn btn-delete hoverable" 
                      style={{ 
                        height: "36px", 
                        padding: "0 6px", 
                        fontSize: "12px", 
                        borderRadius: "8px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "4px",
                        fontWeight: "600"
                      }} 
                      onClick={() => deleteSession(s.session_id)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TRACK SESSION MODAL */}
        {trackSessionId && (
          <div className="glass-modal-overlay">
            <div className="card glass-modal flex-col gap-md" style={{ width: "100%", maxWidth: "800px", maxHeight: "85vh", borderRadius: "20px", display: "flex", flexDirection: "column", margin: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Live Tracking</h3>
                  <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "14px" }}>Session: {trackSessionId}</p>
                </div>
                <button className="btn" onClick={() => setTrackSessionId(null)}>Close</button>
              </div>
              
              <div style={{ overflowY: "auto", flexGrow: 1, paddingRight: "8px" }}>
                {trackData.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>No expected students found. Did you upload the master list?</p>
                ) : (
                  <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left", minWidth: "280px" }}>
                    <thead style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                      <tr>
                        <th style={{ padding: "12px 14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>USN</th>
                        <th style={{ padding: "12px 14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Name</th>
                        <th style={{ padding: "12px 14px", color: "var(--text-secondary)", textAlign: "right", whiteSpace: "nowrap" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackData.map((s) => {
                        let statusColor = "";
                        let statusText = s.status.toUpperCase();
                        let bg = "";
                        
                        if (s.status === 'done') {
                          statusColor = "#166534"; bg = "#DCFCE7";
                        } else if (s.status === 'pending') {
                          statusColor = "#92400E"; bg = "#FEF3C7";
                        } else {
                          statusColor = "#991B1B"; bg = "#FEE2E2";
                          statusText = "MISSING";
                        }
                        
                        return (
                          <tr key={s.usn} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "12px 14px", fontWeight: "600", color: "var(--text-primary)" }}>{s.usn}</td>
                            <td style={{ padding: "12px 14px" }}>{s.name}</td>
                            <td style={{ padding: "12px 14px", textAlign: "right" }}>
                              <span style={{ backgroundColor: bg, color: statusColor, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </PageTransition>
  );
}
