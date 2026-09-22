import { CheckCircle2, AlertCircle } from "lucide-react";

export default function FacultyAnalyticsChart({ expandedGraphId, setExpandedGraphId, graphData }) {
  if (!expandedGraphId) return null;

  return (
    <div className="modal-overlay" onClick={() => setExpandedGraphId(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "600px", padding: "40px", borderRadius: "24px", background: "#ffffff", boxShadow: "0 25px 50px -12px var(--focus-ring)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", maxHeight: "85vh", overflowY: "auto", border: "1px solid var(--focus-ring)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h3 className="title-medium text-gradient" style={{ margin: 0, fontSize: "24px" }}>Subject Feedback Analysis</h3>
            <p style={{ margin: "6px 0 0 0", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>{expandedGraphId}</p>
          </div>
          <button 
            className="btn" 
            onClick={() => setExpandedGraphId(null)} 
            style={{ width: "36px", height: "36px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-light)", border: "none", borderRadius: "50%", color: "var(--text-secondary)", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.transform = "rotate(90deg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-light)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.transform = "rotate(0deg)"; }}
          >
            ✕
          </button>
        </div>

        <div className="flex-col gap-sm" style={{ width: "100%", alignItems: "center" }}>
          {graphData.length > 0 ? (
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", background: "#f8fafc", borderRadius: "16px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "4px" }}>Overall Subject Score</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>Average of all {graphData.length} metrics</div>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)", display: "flex", alignItems: "baseline", gap: "4px" }}>
                  {(graphData.reduce((acc, curr) => acc + curr.rating, 0) / graphData.length).toFixed(2)}
                  <span style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: "600" }}>/ 5</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", width: "100%", padding: "4px", maxHeight: "400px", overflowY: "auto" }}>
                {[...graphData].sort((a, b) => {
                  const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                  const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                  return numA - numB;
                }).map((data, index) => {
                  const scoreColor = data.rating >= 4 ? "#10B981" : data.rating >= 3 ? "#F59E0B" : "#EF4444";
                  const scoreBg = data.rating >= 4 ? "rgba(16, 185, 129, 0.1)" : data.rating >= 3 ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)";
                  
                  return (
                    <div key={index} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)"; e.currentTarget.style.borderColor = "var(--primary)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.05)"; e.currentTarget.style.borderColor = "#e2e8f0"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", border: "1px solid #e2e8f0" }}>{data.name}</span>
                        <span style={{ background: scoreBg, color: scoreColor, padding: "4px 8px", borderRadius: "6px", fontSize: "14px", fontWeight: "800", display: "flex", alignItems: "center", gap: "4px" }}>
                          {data.rating >= 4 ? <CheckCircle2 size={14} /> : data.rating < 3 ? <AlertCircle size={14} /> : null}
                          {parseFloat(data.rating).toFixed(2)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)", fontWeight: "600", lineHeight: "1.5" }}>{data.question_text}</p>
                      <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden", marginTop: "auto" }}>
                        <div style={{ width: `${(data.rating / 5) * 100}%`, height: "100%", background: scoreColor, borderRadius: "4px", transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)" }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Loading analysis data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
