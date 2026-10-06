import React, { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";
import { 
  Clock, 
  Sliders, 
  Check, 
  Send, 
  ShieldCheck, 
  X,
  Plus,
  Minus,
  Zap,
  Timer,
  Sparkles,
  Info,
  RotateCcw
} from "lucide-react";

const PRESET_OPTIONS = [
  { 
    label: "Instant Submission", 
    tag: "0s (Instant)",
    seconds: 0, 
    description: "No review waiting time; submit immediately",
    icon: Zap,
    isFullWidth: false
  },
  { 
    label: "1 Minute", 
    tag: "60 Seconds",
    seconds: 60, 
    description: "Rapid review pace for concise surveys",
    icon: Timer,
    isFullWidth: false
  },
  { 
    label: "2 Minutes", 
    tag: "120 Seconds",
    seconds: 120, 
    description: "Optimal balance for typical evaluations",
    icon: Sparkles,
    isRecommended: true,
    isFullWidth: false
  },
  { 
    label: "3 Minutes", 
    tag: "180 Seconds",
    seconds: 180, 
    description: "Encourages thorough reading of all questions",
    icon: Clock,
    isFullWidth: false
  },
  { 
    label: "5 Minutes", 
    tag: "300 Seconds",
    seconds: 300, 
    description: "Maximum anti-spam dwell time for formal institutional audits",
    icon: ShieldCheck,
    isFullWidth: true
  }
];

export default function FeedbackTimingModal({ 
  isOpen, 
  onClose, 
  dept_id, 
  currentSeconds = 300, 
  onSaveSuccess 
}) {
  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "custom"
  const [selectedSeconds, setSelectedSeconds] = useState(currentSeconds ?? 300);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial = currentSeconds ?? 300;
      setSelectedSeconds(initial);
      const isPreset = PRESET_OPTIONS.some(p => p.seconds === initial);
      setActiveTab(isPreset ? "presets" : "custom");
    }
  }, [isOpen, currentSeconds]);

  if (!isOpen) return null;

  // Minutes and Seconds calculation
  const currentMinutes = Math.floor(selectedSeconds / 60);
  const currentSecRemainder = selectedSeconds % 60;

  const handleMinutesChange = (newM) => {
    const val = Math.max(0, Math.min(30, parseInt(newM, 10) || 0));
    setSelectedSeconds(val * 60 + currentSecRemainder);
  };

  const handleSecondsChange = (newS) => {
    const val = Math.max(0, Math.min(59, parseInt(newS, 10) || 0));
    setSelectedSeconds(currentMinutes * 60 + val);
  };

  const adjustMinutes = (delta) => {
    const nextM = Math.max(0, Math.min(30, currentMinutes + delta));
    setSelectedSeconds(nextM * 60 + currentSecRemainder);
  };

  const adjustSeconds = (delta) => {
    const next = Math.max(0, Math.min(1800, selectedSeconds + delta));
    setSelectedSeconds(next);
  };

  const formatSummaryText = (secs) => {
    if (secs === 0) {
      return "Instant Submission Enabled — Students are not held back by any countdown timer and may submit once questions are answered.";
    }
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    let parts = [];
    if (mins > 0) parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);
    if (remainder > 0) parts.push(`${remainder} second${remainder > 1 ? "s" : ""}`);
    
    return `Students must spend at least ${parts.join(" and ")} reviewing their feedback before the 'Submit All Feedback' button unlocks.`;
  };

  const formatTimerClock = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put(
        `/department/timing/${dept_id}`, 
        { min_time_sec: selectedSeconds }, 
        { withCredentials: true }
      );
      toast.success(res.data?.message || "Submission timer updated successfully");
      if (onSaveSuccess) onSaveSuccess(selectedSeconds);
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to update submission timer";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="timing-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget && !saving) onClose();
    }}>
      <style>{`
        .timing-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 16px;
          animation: timingFadeIn 0.2s ease-out;
          box-sizing: border-box;
        }

        @keyframes timingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes timingPopUp {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .timing-modal-container {
          width: 100%;
          max-width: 650px;
          max-height: min(92vh, 720px);
          background: #FFFFFF;
          border-radius: 16px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.9) inset;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: timingPopUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }

        .timing-modal-header {
          padding: 18px 22px 14px 22px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #F1F5F9;
          background: #FFFFFF;
          flex-shrink: 0;
          gap: 12px;
        }

        .timing-modal-tabs {
          padding: 12px 22px 0 22px;
          flex-shrink: 0;
          background: #FFFFFF;
        }

        .timing-modal-body {
          padding: 14px 22px 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .timing-modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .timing-modal-body::-webkit-scrollbar-track {
          background: #F8FAFC;
        }
        .timing-modal-body::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .timing-modal-body::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }

        .timing-modal-footer {
          padding: 13px 22px;
          border-top: 1px solid #F1F5F9;
          background: #F8FAFC;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        /* 2-Column Responsive Grid for Presets */
        .timing-presets-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 9px;
        }

        .timing-preset-full {
          grid-column: span 2;
        }

        .timing-preset-card {
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-sizing: border-box;
        }
        .timing-preset-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.06);
        }

        .timing-steppers-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .timing-stepper-btn {
          transition: all 0.15s ease;
          user-select: none;
        }
        .timing-stepper-btn:hover:not(:disabled) {
          background: #F1F5F9 !important;
          border-color: #94A3B8 !important;
        }
        .timing-stepper-btn:active:not(:disabled) {
          transform: scale(0.96);
        }

        .timing-preview-row {
          background: #F8FAFC;
          border-radius: 10px;
          padding: 11px 14px;
          border: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-sizing: border-box;
        }

        /* Responsive Mobile Adjustments */
        @media (max-width: 600px) {
          .timing-modal-overlay {
            padding: 10px;
            align-items: center;
          }
          .timing-modal-container {
            max-height: calc(100vh - 20px);
            border-radius: 14px;
          }
          .timing-modal-header {
            padding: 14px 14px 10px 14px;
          }
          .timing-modal-tabs {
            padding: 10px 14px 0 14px;
          }
          .timing-modal-body {
            padding: 12px 14px 14px 14px;
            gap: 12px;
          }
          .timing-modal-footer {
            padding: 11px 14px;
            flex-direction: row;
            gap: 8px;
          }
          .timing-modal-footer button {
            flex: 1;
            justify-content: center;
            height: 40px;
          }
          .timing-presets-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .timing-preset-full {
            grid-column: span 1;
          }
          .timing-steppers-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .timing-preview-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .timing-preview-row > div:last-child {
            display: flex;
            justify-content: stretch;
          }
          .timing-preview-row > div:last-child > div {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 400px) {
          .timing-steppers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="timing-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Accent Gradient Bar */}
        <div style={{
          height: "3px",
          background: "linear-gradient(90deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%)",
          width: "100%",
          flexShrink: 0
        }} />

        {/* Header (Fixed Top) */}
        <div className="timing-modal-header">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", minWidth: 0 }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#F1F5F9",
              border: "1px solid #CBD5E1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1E3A8A",
              flexShrink: 0,
              marginTop: "2px"
            }}>
              <Clock size={19} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0F172A", letterSpacing: "-0.01em" }}>
                  Feedback Submission Timer
                </h3>
                <span style={{
                  background: "#EEF2F6",
                  color: "#1E293B",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.3px",
                  border: "1px solid #CBD5E1"
                }}>
                  {dept_id?.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B", lineHeight: "1.35" }}>
                Configure the mandatory review dwell time for student evaluations
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "7px",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
              transition: "all 0.15s ease",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F1F5F9";
              e.currentTarget.style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F8FAFC";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher (Fixed) */}
        <div className="timing-modal-tabs">
          <div style={{
            display: "flex",
            background: "#F1F5F9",
            borderRadius: "8px",
            padding: "3px",
            border: "1px solid #E2E8F0"
          }}>
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: activeTab === "presets" ? "700" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: activeTab === "presets" ? "#FFFFFF" : "transparent",
                color: activeTab === "presets" ? "#1E3A8A" : "#64748B",
                boxShadow: activeTab === "presets" ? "0 1px 3px rgba(15, 23, 42, 0.08)" : "none"
              }}
            >
              Standard Durations
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "12.5px",
                fontWeight: activeTab === "custom" ? "700" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: activeTab === "custom" ? "#FFFFFF" : "transparent",
                color: activeTab === "custom" ? "#1E3A8A" : "#64748B",
                boxShadow: activeTab === "custom" ? "0 1px 3px rgba(15, 23, 42, 0.08)" : "none"
              }}
            >
              Custom Stepper (Min / Sec)
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="timing-modal-body">
          
          {/* TAB 1: PRESET CARDS (Fluid 2-col on Desktop, 1-col on Mobile) */}
          {activeTab === "presets" && (
            <div className="timing-presets-grid">
              {PRESET_OPTIONS.map((preset) => {
                const isSelected = selectedSeconds === preset.seconds;
                const IconComponent = preset.icon;

                return (
                  <div
                    key={preset.seconds}
                    className={`timing-preset-card ${preset.isFullWidth ? "timing-preset-full" : ""}`}
                    onClick={() => setSelectedSeconds(preset.seconds)}
                    style={{
                      border: isSelected ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                      background: isSelected ? "#F4F8FF" : "#FFFFFF",
                      boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.1)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
                      <div style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "7px",
                        background: isSelected ? "#EFF6FF" : "#F8FAFC",
                        color: isSelected ? "#2563EB" : "#475569",
                        border: isSelected ? "1px solid #BFDBFE" : "1px solid #E2E8F0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <IconComponent size={15} strokeWidth={2.2} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                          <span style={{ 
                            fontSize: "13px", 
                            fontWeight: isSelected ? "700" : "600", 
                            color: isSelected ? "#1E3A8A" : "#0F172A" 
                          }}>
                            {preset.label}
                          </span>
                          {preset.isRecommended && (
                            <span style={{
                              fontSize: "9.5px",
                              fontWeight: "700",
                              color: "#FFFFFF",
                              background: "#2563EB",
                              padding: "1px 5px",
                              borderRadius: "4px"
                            }}>
                              Recommended
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px", lineHeight: "1.25" }}>
                          {preset.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: isSelected ? "#2563EB" : "#64748B",
                        fontVariantNumeric: "tabular-nums"
                      }}>
                        {formatTimerClock(preset.seconds)}
                      </span>
                      <div style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        border: isSelected ? "none" : "1.5px solid #CBD5E1",
                        background: isSelected ? "#2563EB" : "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s ease"
                      }}>
                        {isSelected && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CUSTOM ADJUSTMENT (CRYSTAL-CLEAR & INTUITIVE) */}
          {activeTab === "custom" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              {/* Digital Readout */}
              <div style={{
                background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
                borderRadius: "10px",
                padding: "10px 14px",
                border: "1px solid #DBEAFE",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px"
              }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: "10.5px", fontWeight: "700", textTransform: "uppercase", color: "#64748B", letterSpacing: "0.5px" }}>
                    Configured Duration
                  </span>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A", marginTop: "1px", wordBreak: "break-word" }}>
                    {selectedSeconds === 0 ? "Instant (0 seconds)" : `${currentMinutes} Minute${currentMinutes !== 1 ? "s" : ""} ${currentSecRemainder > 0 ? `${currentSecRemainder} Seconds` : ""}`}
                  </div>
                </div>

                <div style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "#1E3A8A",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "1px",
                  background: "#FFFFFF",
                  padding: "4px 10px",
                  borderRadius: "7px",
                  border: "1px solid #CBD5E1",
                  flexShrink: 0
                }}>
                  {formatTimerClock(selectedSeconds)}
                </div>
              </div>

              {/* Dual Numeric Steppers */}
              <div className="timing-steppers-grid">
                
                {/* Minutes Stepper */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  border: "1px solid #E2E8F0"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "11.5px", fontWeight: "700", color: "#334155" }}>
                      Minutes
                    </label>
                    <span style={{ fontSize: "10.5px", color: "#94A3B8" }}>0–30 min</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      className="timing-stepper-btn"
                      onClick={() => adjustMinutes(-1)}
                      disabled={currentMinutes <= 0}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "7px",
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        color: "#334155",
                        cursor: currentMinutes <= 0 ? "not-allowed" : "pointer",
                        opacity: currentMinutes <= 0 ? 0.35 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>

                    <input 
                      type="number"
                      min={0}
                      max={30}
                      value={currentMinutes}
                      onChange={(e) => handleMinutesChange(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: "36px",
                        height: "36px",
                        textAlign: "center",
                        borderRadius: "7px",
                        border: "1.5px solid #CBD5E1",
                        background: "#F8FAFC",
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#0F172A",
                        outline: "none"
                      }}
                    />

                    <button
                      type="button"
                      className="timing-stepper-btn"
                      onClick={() => adjustMinutes(1)}
                      disabled={currentMinutes >= 30}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "7px",
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        color: "#334155",
                        cursor: currentMinutes >= 30 ? "not-allowed" : "pointer",
                        opacity: currentMinutes >= 30 ? 0.35 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Seconds Stepper */}
                <div style={{
                  background: "#FFFFFF",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  border: "1px solid #E2E8F0"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "11.5px", fontWeight: "700", color: "#334155" }}>
                      Seconds
                    </label>
                    <span style={{ fontSize: "10.5px", color: "#94A3B8" }}>0–45 sec</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      className="timing-stepper-btn"
                      onClick={() => adjustSeconds(-15)}
                      disabled={selectedSeconds <= 0}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "7px",
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        color: "#334155",
                        cursor: selectedSeconds <= 0 ? "not-allowed" : "pointer",
                        opacity: selectedSeconds <= 0 ? 0.35 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>

                    <input 
                      type="number"
                      min={0}
                      max={59}
                      step={15}
                      value={currentSecRemainder}
                      onChange={(e) => handleSecondsChange(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: "36px",
                        height: "36px",
                        textAlign: "center",
                        borderRadius: "7px",
                        border: "1.5px solid #CBD5E1",
                        background: "#F8FAFC",
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#0F172A",
                        outline: "none"
                      }}
                    />

                    <button
                      type="button"
                      className="timing-stepper-btn"
                      onClick={() => adjustSeconds(15)}
                      disabled={selectedSeconds >= 1800}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "7px",
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        color: "#334155",
                        cursor: selectedSeconds >= 1800 ? "not-allowed" : "pointer",
                        opacity: selectedSeconds >= 1800 ? 0.35 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Quick Adjustment Shortcuts */}
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "600", marginRight: "2px" }}>Quick Shortcuts:</span>
                {[
                  { label: "+15s", delta: 15 },
                  { label: "+30s", delta: 30 },
                  { label: "+1m", delta: 60 },
                  { label: "+2m", delta: 120 }
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => adjustSeconds(chip.delta)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "5px",
                      border: "1px solid #CBD5E1",
                      background: "#FFFFFF",
                      color: "#1E293B",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F1F5F9";
                      e.currentTarget.style.borderColor = "#94A3B8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#CBD5E1";
                    }}
                  >
                    {chip.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSelectedSeconds(0)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "5px",
                    border: "1px solid #FECACA",
                    background: "#FEF2F2",
                    color: "#B91C1C",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px"
                  }}
                >
                  <RotateCcw size={10} /> Instant (0s)
                </button>
              </div>

            </div>
          )}

          {/* Active Behavior Clarity Banner */}
          <div style={{
            background: selectedSeconds === 0 ? "#F8FAFC" : "#F0F7FF",
            border: selectedSeconds === 0 ? "1px solid #E2E8F0" : "1px solid #BFDBFE",
            borderLeft: selectedSeconds === 0 ? "3px solid #64748B" : "3px solid #2563EB",
            borderRadius: "8px",
            padding: "9px 12px",
            display: "flex",
            alignItems: "flex-start",
            gap: "9px"
          }}>
            <Info size={15} color={selectedSeconds === 0 ? "#64748B" : "#2563EB"} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: selectedSeconds === 0 ? "#0F172A" : "#1E3A8A", marginBottom: "1px" }}>
                Active Student Rule
              </div>
              <div style={{ fontSize: "11.5px", color: selectedSeconds === 0 ? "#475569" : "#1E40AF", lineHeight: "1.35" }}>
                {formatSummaryText(selectedSeconds)}
              </div>
            </div>
          </div>

          {/* Student Button Preview */}
          <div className="timing-preview-row">
            <div>
              <div style={{ fontSize: "10.5px", color: "#64748B", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.4px" }}>
                Student Button Appearance
              </div>
              <div style={{ fontSize: "12px", color: "#0F172A", fontWeight: "600", marginTop: "1px" }}>
                {selectedSeconds === 0 ? "Unlocked immediately upon answering questions" : `Locked for ${formatTimerClock(selectedSeconds)} dwell period`}
              </div>
            </div>

            <div>
              {selectedSeconds === 0 ? (
                <div style={{
                  background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
                  color: "#FFFFFF",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 5px rgba(37, 99, 235, 0.25)"
                }}>
                  <Send size={12} /> Submit All Feedback
                </div>
              ) : (
                <div style={{
                  background: "#E2E8F0",
                  color: "#475569",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid #CBD5E1"
                }}>
                  <Clock size={12} /> Submit in {formatTimerClock(selectedSeconds)}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer (Fixed Bottom) */}
        <div className="timing-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "7px 15px",
              borderRadius: "7px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontWeight: "600",
              fontSize: "12.5px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#F1F5F9"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#FFFFFF"}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "7px 18px",
              borderRadius: "7px",
              border: "none",
              background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
              color: "#FFFFFF",
              fontWeight: "600",
              fontSize: "12.5px",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              opacity: saving ? 0.75 : 1,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.filter = "brightness(1.08)";
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.filter = "none";
            }}
          >
            <Check size={13} strokeWidth={2.5} /> {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>

      </div>
    </div>
  );
}
