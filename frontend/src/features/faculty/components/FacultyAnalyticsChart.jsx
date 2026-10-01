import { CheckCircle2, AlertCircle } from "lucide-react";

export default function FacultyAnalyticsChart({ expandedGraphId, setExpandedGraphId, graphData = [] }) {
  if (!expandedGraphId) return null;

  const totalScore = graphData.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0);
  const overallAvg = graphData.length > 0 ? (totalScore / graphData.length).toFixed(2) : "0.00";
  const overallPercent = Math.min(100, Math.round((parseFloat(overallAvg) / 5) * 100));

  // Group data by section heading
  const groupedData = graphData.reduce((acc, curr) => {
    const heading = curr.question_heading || "General Feedback";
    if (!acc[heading]) acc[heading] = [];
    acc[heading].push(curr);
    return acc;
  }, {});

  return (
    <div 
      className="modal-overlay" 
      onClick={() => setExpandedGraphId(null)} 
      style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: "rgba(15, 23, 42, 0.55)", 
        backdropFilter: "blur(8px)", 
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 100000, 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        padding: "16px",
        animation: "fadeIn 0.2s ease-out" 
      }}
    >
      <style>
        {`
          .fac-analytics-modal-card {
            width: 100%;
            max-width: 800px;
            padding: 36px 40px;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px var(--border-color);
            animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
          }

          .fac-analytics-content {
            overflow-y: auto;
            padding-right: 12px;
            margin-right: -12px;
          }
          
          .fac-analytics-content::-webkit-scrollbar {
            width: 5px;
          }
          .fac-analytics-content::-webkit-scrollbar-thumb {
            background: #CBD5E1;
            border-radius: 999px;
          }
          .fac-analytics-content::-webkit-scrollbar-track {
            background: transparent;
          }

          .fac-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 32px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--hover-bg, #F1F5F9);
          }

          .fac-card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            width: 100%;
            padding: 2px;
            box-sizing: border-box;
          }

          .fac-q-card {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
            box-sizing: border-box;
          }

          .fac-q-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px -4px var(--focus-ring);
            border-color: var(--primary);
          }

          .fac-close-btn {
            width: 32px;
            height: 32px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-secondary);
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          }

          .fac-close-btn:hover {
            background: var(--hover-bg, #F1F5F9);
            color: var(--text-primary);
            border-color: #CBD5E1;
          }

          @media (max-width: 640px) {
            .fac-analytics-modal-card {
              padding: 24px 20px !important;
              max-height: 92vh !important;
              border-radius: 12px !important;
            }

            .fac-modal-header {
              margin-bottom: 20px !important;
            }

            .fac-modal-title {
              font-size: 18px !important;
            }

            .fac-score-banner {
              padding: 16px !important;
              margin-bottom: 16px !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 12px !important;
            }

            .fac-section-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
              margin-top: 24px;
            }

            .fac-card-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
          }
        `}
      </style>

      <div 
        className="card fac-analytics-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="fac-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", gap: "16px", flexShrink: 0 }}>
          <div>
            <h3 className="title-medium fac-modal-title" style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Evaluation Report
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
              <span style={{ 
                background: "rgba(15, 23, 42, 0.04)", 
                border: "1px solid rgba(15, 23, 42, 0.1)", 
                color: "var(--text-primary)", 
                fontSize: "13px", 
                fontWeight: "600", 
                padding: "2px 10px", 
                borderRadius: "4px",
                letterSpacing: "0.02em"
              }}>
                SUBJECT: {expandedGraphId}
              </span>
            </div>
          </div>
          
          <button 
            type="button"
            className="btn fac-close-btn" 
            onClick={() => setExpandedGraphId(null)} 
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="fac-analytics-content flex-col gap-sm" style={{ width: "100%" }}>
          {graphData.length > 0 ? (
            <div style={{ width: "100%" }}>
              {/* Overall Score Box */}
              <div 
                className="fac-score-banner"
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "20px 24px", 
                  background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)", 
                  borderRadius: "12px", 
                  marginBottom: "12px", 
                  border: "1px solid #E2E8F0",
                  borderLeft: "4px solid var(--primary)"
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", fontWeight: "700", marginBottom: "4px" }}>
                    Overall Performance
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500", opacity: 0.8 }}>
                    Aggregated across {graphData.length} distinct metrics
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.03em" }}>
                    {overallAvg}
                  </span>
                  <span style={{ fontSize: "15px", color: "var(--text-secondary)", fontWeight: "600" }}>/ 5</span>
                  <span style={{ 
                    marginLeft: "8px",
                    fontSize: "12px", 
                    fontWeight: "800", 
                    color: parseFloat(overallAvg) >= 4 ? "#15803D" : parseFloat(overallAvg) >= 3 ? "#B45309" : "#B91C1C",
                    background: parseFloat(overallAvg) >= 4 ? "#DCFCE7" : parseFloat(overallAvg) >= 3 ? "#FEF3C7" : "#FEE2E2",
                    padding: "4px 8px", 
                    borderRadius: "6px",
                  }}>
                    {overallPercent}%
                  </span>
                </div>
              </div>

              {/* Sections (One by One) */}
              {Object.entries(groupedData).map(([heading, sectionQuestions], sectionIdx) => {
                const sectionScore = sectionQuestions.reduce((acc, curr) => acc + (parseFloat(curr.rating) || 0), 0);
                const sectionAvg = (sectionScore / sectionQuestions.length).toFixed(2);
                
                return (
                  <div key={sectionIdx} style={{ marginBottom: "20px" }}>
                    {/* Section Header */}
                    <div className="fac-section-header">
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {heading}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.02em" }}>Avg:</span>
                        <span style={{ 
                          fontSize: "15px", 
                          fontWeight: "800", 
                          color: parseFloat(sectionAvg) >= 4 ? "#15803D" : parseFloat(sectionAvg) >= 3 ? "#B45309" : "#B91C1C",
                          background: parseFloat(sectionAvg) >= 4 ? "#F0FDF4" : parseFloat(sectionAvg) >= 3 ? "#FFFBEB" : "#FEF2F2",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: `1px solid ${parseFloat(sectionAvg) >= 4 ? "#BBF7D0" : parseFloat(sectionAvg) >= 3 ? "#FEF08A" : "#FECACA"}`
                        }}>
                          {sectionAvg}
                        </span>
                      </div>
                    </div>

                    {/* Questions Grid for this Section */}
                    <div className="fac-card-grid">
                      {[...sectionQuestions].sort((a, b) => {
                        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                        return numA - numB;
                      }).map((data, index) => {
                        const rating = parseFloat(data.rating) || 0;
                        const scoreColor = rating >= 4 ? "#15803D" : rating >= 3 ? "#B45309" : "#B91C1C";
                        const scoreBg = rating >= 4 ? "#F0FDF4" : rating >= 3 ? "#FFFBEB" : "#FEF2F2";
                        const percent = Math.min(100, Math.round((rating / 5) * 100));

                        return (
                          <div 
                            key={index} 
                            className="fac-q-card"
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                              <span style={{ 
                                color: "var(--text-secondary)", 
                                fontSize: "12px", 
                                fontWeight: "700",
                                letterSpacing: "0.02em"
                              }}>
                                {data.name}
                              </span>

                              <span style={{ 
                                background: scoreBg, 
                                color: scoreColor, 
                                padding: "2px 8px", 
                                borderRadius: "4px", 
                                fontSize: "12px", 
                                fontWeight: "800", 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "4px" 
                              }}>
                                {rating >= 4 ? <CheckCircle2 size={12} /> : rating < 3 ? <AlertCircle size={12} /> : null}
                                {rating.toFixed(2)}
                              </span>
                            </div>

                            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)", fontWeight: "500", lineHeight: "1.5" }}>
                              {data.question_text}
                            </p>

                            <div style={{ marginTop: "auto" }}>
                              <div style={{ width: "100%", height: "4px", background: "rgba(15, 23, 42, 0.06)", borderRadius: "999px", overflow: "hidden", marginBottom: "6px" }}>
                                <div 
                                  style={{ 
                                    width: `${percent}%`, 
                                    height: "100%", 
                                    background: scoreColor, 
                                    borderRadius: "999px", 
                                    transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" 
                                  }}
                                />
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.01em" }}>
                                <span>Score: <strong style={{ color: scoreColor }}>{rating.toFixed(2)}</strong></span>
                                <span>{percent}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
