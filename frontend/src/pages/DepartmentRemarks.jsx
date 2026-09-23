import { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { useParams, useOutletContext } from "react-router-dom";
import { toast } from "react-hot-toast";
import { MessageSquare, Sparkles, Filter, Clock } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import PageTransition from "../components/PageTransition";
import { useSessions } from "../hooks/useSessions";

export default function DepartmentRemarks() {
  const { dept_id } = useParams();
  const { sessions } = useSessions(dept_id);
  
  const [remarks, setRemarks] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedSession, setSelectedSession] = useState("all");
  const [modalSession, setModalSession] = useState(null);

  useEffect(() => {
    fetchRemarks();
  }, [selectedSession, dept_id]);

  const fetchRemarks = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/department/remarks/${dept_id}`, {
        params: { session_id: selectedSession },
        withCredentials: true
      });
      setRemarks(res.data.remarks || []);
      setAiSummary(res.data.ai_summary || null);
    } catch (err) {
      toast.error("Failed to load remarks");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setAnalyzing(true);
    try {
      const res = await apiClient.post("/department/remarks/analyze", {
        dept_id,
        session_id: selectedSession
      }, { withCredentials: true });
      
      setAiSummary(res.data.ai_summary);
      toast.success("AI Summary generated!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to generate AI summary.");
    } finally {
      setAnalyzing(false);
    }
  };

  const groupedRemarks = remarks.reduce((acc, r) => {
    if (!acc[r.session_id]) {
      acc[r.session_id] = {
        session_id: r.session_id,
        sem: r.sem || "N/A",
        section: r.section || "N/A",
        comments: []
      };
    }
    acc[r.session_id].comments.push(r);
    return acc;
  }, {});
  const sessionList = Object.values(groupedRemarks);

  return (
    <PageTransition>
      <div style={{ animation: "fadeIn 0.3s ease-out" }}>
        
        <style>
          {`
            @media (max-width: 600px) {
              .remarks-summary-header {
                padding: 20px 16px !important;
              }
              .remarks-summary-body {
                padding: 20px 16px !important;
              }
              .remarks-scope-filter {
                width: 100% !important;
              }
              .remarks-scope-filter select {
                width: 100% !important;
                flex: 1;
              }
            }
          `}
        </style>

        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "32px", padding: "10px 0" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ background: "var(--focus-ring)", padding: "10px", borderRadius: "10px" }}>
                <MessageSquare size={24} color="var(--primary)" />
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
                Remarks & AI Analysis
              </h1>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px", margin: 0, fontWeight: "500" }}>
              Review anonymous student remarks and generate AI summaries.
            </p>
          </div>

          {/* Session Filter */}
          <div className="remarks-scope-filter" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={16} /> Scope:
            </label>
            <select 
              className="form-input hoverable" 
              value={selectedSession} 
              onChange={(e) => setSelectedSession(e.target.value)}
              style={{ width: "220px", padding: "10px", cursor: "pointer", background: "#fff" }}
            >
              <option value="all">Entire Department</option>
              {sessions.map(s => (
                <option key={s.session_id} value={s.session_id}>{s.session_id} - Sem {s.sem} Sec {s.section}</option>
              ))}
            </select>
          </div>
        </div>

        {/* AI SUMMARY CARD */}
        <div className="card" style={{ marginBottom: "40px", border: "1px solid #E2E8F0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          <div className="remarks-summary-header" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "white" }}>
              <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px", borderRadius: "10px", backdropFilter: "blur(10px)" }}>
                <Sparkles size={24} color="var(--gold)" />
              </div>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.3px", color: "#ffffff" }}>
                  {selectedSession === "all" ? "Department Executive Summary" : `Session AI Analysis: ${selectedSession}`}
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: "#CBD5E1", fontWeight: "500" }}>Generated by Gemini Intelligence</p>
              </div>
            </div>
            
            {!aiSummary && remarks.length > 0 && (
               <button 
                 className="btn hoverable" 
                 onClick={handleGenerateSummary}
                 disabled={analyzing}
                 style={{ padding: "12px 24px", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", background: "var(--gold)", color: "var(--navy)", border: "none", boxShadow: "0 4px 15px rgba(245,158,11,0.3)" }}
               >
                 {analyzing ? "Analyzing Data..." : <><Sparkles size={18} /> Generate AI Report</>}
               </button>
            )}
          </div>

          <div className="remarks-summary-body" style={{ padding: "40px 32px", background: "#fff" }}>
            {!aiSummary ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                 <div style={{ background: "#F8FAFC", padding: "20px", borderRadius: "50%" }}>
                   <Sparkles size={40} color="#CBD5E1" />
                 </div>
                 <p style={{ fontSize: "16px", fontWeight: "500" }}>
                   {remarks.length === 0 ? "No remarks available to analyze for this scope." : "No AI Summary has been generated for this scope yet. Click the button above to synthesize the data!"}
                 </p>
              </div>
            ) : (
              <div className="markdown-body" style={{ color: "#334155", lineHeight: "1.8", fontSize: "15px" }}>
                <ReactMarkdown
                  components={{
                    h3: ({node, ...props}) => <h3 style={{ color: "var(--navy)", fontSize: "1.3rem", fontWeight: "800", marginTop: "24px", marginBottom: "12px", borderBottom: "2px solid #F1F5F9", paddingBottom: "8px" }} {...props} />,
                    strong: ({node, ...props}) => <strong style={{ color: "var(--navy)", fontWeight: "700" }} {...props} />,
                    ul: ({node, ...props}) => <ul style={{ paddingLeft: "24px", margin: "12px 0 24px 0" }} {...props} />,
                    li: ({node, ...props}) => <li style={{ marginBottom: "10px", paddingLeft: "8px" }} {...props} />,
                  }}
                >
                  {aiSummary}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* RAW REMARKS FEED */}
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--navy)", marginBottom: "16px", paddingLeft: "4px" }}>
            Raw Anonymous Remarks ({remarks.length})
          </h3>
          
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--slate)" }}>Loading remarks...</div>
          ) : remarks.length === 0 ? (
            <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--slate)", borderStyle: "dashed" }}>
              No remarks found for this scope.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
              {sessionList.map(session => (
                <div 
                  key={session.session_id} 
                  className="card hoverable" 
                  onClick={() => setModalSession(session)}
                  style={{ border: "1px solid #E2E8F0", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "#fff", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ background: "rgba(30, 58, 138, 0.08)", padding: "12px", borderRadius: "12px", color: "var(--navy)" }}>
                      <MessageSquare size={24} />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)", background: "rgba(59, 130, 246, 0.1)", padding: "6px 12px", borderRadius: "20px" }}>
                      {session.comments.length} Remarks
                    </span>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>Session {session.session_id}</h4>
                    <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span>Sem {session.sem}</span>
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#CBD5E1" }}></span>
                      <span>Sec {session.section}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* RAW REMARKS MODAL */}
      {modalSession && (
        <div className="glass-modal-overlay">
          <div className="card glass-modal flex-col gap-md" style={{ width: "100%", maxWidth: "700px", maxHeight: "85vh", borderRadius: "20px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Session {modalSession.session_id}</h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>
                  Semester {modalSession.sem} • Section {modalSession.section}
                </p>
              </div>
              <button className="btn hoverable" style={{ padding: "8px 16px", background: "#F1F5F9", color: "#475569", fontWeight: "600", border: "none", borderRadius: "8px" }} onClick={() => setModalSession(null)}>
                Close
              </button>
            </div>
            
            <div style={{ overflowY: "auto", flexGrow: 1, paddingRight: "8px", display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
              {modalSession.comments.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>No comments available.</p>
              ) : (
                modalSession.comments.map((r, i) => (
                  <div key={r.remark_id} style={{ background: "#F8FAFC", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--navy)" }}>Anonymous #{i + 1}</span>
                      <span style={{ fontSize: "12px", color: "var(--slate)", display: "flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                        <Clock size={12} /> {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "#334155", fontSize: "15px", lineHeight: "1.6", fontStyle: "italic" }}>
                      "{r.remark_text}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
