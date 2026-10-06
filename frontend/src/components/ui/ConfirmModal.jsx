import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  subtext = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
  isDanger,
  isLoading = false,
}) {
  const handleClose = () => {
    if (typeof onClose === "function") onClose();
    else if (typeof onCancel === "function") onCancel();
  };
  const isDangerous = isDanger !== undefined ? isDanger : isDestructive;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!isLoading) handleClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#FFFFFF",
          borderRadius: "20px",
          padding: "24px 28px",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)",
          animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header with Icon & Close */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: isDangerous ? "#FEE2E2" : "#FEF3C7",
              color: isDangerous ? "#DC2626" : "#D97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isDangerous ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close confirmation dialog"
            style={{
              background: "transparent",
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F1F5F9")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div>
          <h3
            style={{
              margin: "0 0 6px 0",
              fontSize: "18px",
              fontWeight: "700",
              color: "#0F172A",
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: "0 0 6px 0",
              fontSize: "14px",
              color: "#334155",
              lineHeight: 1.5,
              fontWeight: "500",
            }}
          >
            {message}
          </p>
          {subtext && (
            <p
              style={{
                margin: 0,
                fontSize: "12.5px",
                color: "#64748B",
                lineHeight: 1.4,
              }}
            >
              {subtext}
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={isLoading}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontWeight: "600",
              fontSize: "13.5px",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: isDangerous ? "#DC2626" : "var(--primary)",
              color: "#FFFFFF",
              fontWeight: "600",
              fontSize: "13.5px",
              cursor: isLoading ? "not-allowed" : "pointer",
              boxShadow: isDangerous
                ? "0 4px 12px rgba(220, 38, 38, 0.3)"
                : "0 4px 12px rgba(37, 99, 235, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "transform 0.15s, opacity 0.15s",
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
