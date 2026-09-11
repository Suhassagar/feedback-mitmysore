import { Star, AlertCircle } from "lucide-react";

export default function OverallAnalyticsModal({ showOverallAnalyticsModal, setShowOverallAnalyticsModal, selectedFaculty, facultyAnalytics }) {
  if (!showOverallAnalyticsModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowOverallAnalyticsModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)", zIndex: 100000, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: "1000px", height: "80vh", maxHeight: "800px", borderRadius: "24px", background: "#ffffff", boxShadow: "0 25px 50px -12px var(--focus-ring)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", border: "1px solid var(--focus-ring)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        <div style={{ padding: "32px", borderBottom: "1px solid var(--border-color)", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--focus-ring)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Star size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>Overall Performance Analysis</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>Deep dive across all assigned subjects for {selectedFaculty?.name}</p>
            </div>
          </div>
          <button className="btn" onClick={() => setShowOverallAnalyticsModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "8px" }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: "32px", overflowY: "auto", background: "#fff", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Average Rating</div>
              <div style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)", display: "flex", alignItems: "baseline", gap: "8px" }}>
                {selectedFaculty.avgRating} <span style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: "600" }}>/ 5</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {facultyAnalytics?.radarData && [...facultyAnalytics.radarData]
              .sort((a, b) => {
                const numA = parseInt(a.question.match(/\d+/)?.[0] || 0);
                const numB = parseInt(b.question.match(/\d+/)?.[0] || 0);
                return numA - numB;
              })
              .map((q, idx) => {
                const rating = parseFloat(q.avg_rating);
                let color = "#10B981"; // Green
                let bg = "rgba(16, 185, 129, 0.15)";
                if (rating < 3.0) { color = "#EF4444"; bg = "rgba(239, 68, 68, 0.15)"; } // Red
                else if (rating < 4.0) { color = "#F59E0B"; bg = "rgba(245, 158, 11, 0.15)"; } // Orange

                return (
                  <div key={idx} style={{ padding: "20px", background: "#f8fafc", borderRadius: "16px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "var(--text-secondary)", background: "#e2e8f0", padding: "4px 8px", borderRadius: "6px" }}>Q{idx + 1}</span>
                        {rating < 3.0 && <AlertCircle size={16} color="#EF4444" />}
                      </div>
                      <p style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", lineHeight: "1.5" }}>{q.question}</p>
                    </div>
                    
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "flex-end" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Score</span>
                        <span style={{ fontSize: "18px", fontWeight: "800", color }}>{rating.toFixed(2)}</span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: bg, borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(rating / 5) * 100}%`, background: color, borderRadius: "4px", transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)" }}></div>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}
