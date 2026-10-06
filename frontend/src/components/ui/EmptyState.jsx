import React from "react";
import { Inbox, Plus } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No data found",
  description = "There are no records to display at this time.",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  style = {},
}) {
  return (
    <div
      className="dash-card"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "28px 16px" : "48px 24px",
        background: "#FFFFFF",
        borderRadius: "16px",
        border: "1px dashed var(--border-color)",
        width: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          width: compact ? "44px" : "60px",
          height: compact ? "44px" : "60px",
          borderRadius: "16px",
          background: "var(--bg-light, #EFF6FF)",
          color: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: compact ? "12px" : "18px",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.08)",
        }}
      >
        <Icon size={compact ? 22 : 30} strokeWidth={1.75} />
      </div>

      <h4
        style={{
          margin: "0 0 6px 0",
          fontSize: compact ? "15px" : "17px",
          fontWeight: "700",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h4>

      <p
        style={{
          margin: "0 0 18px 0",
          fontSize: "13.5px",
          color: "var(--text-secondary)",
          maxWidth: "420px",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          {actionLabel && (
            <button
              type="button"
              className="btn hoverable"
              onClick={onAction}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "10px",
                background: "var(--primary)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              }}
            >
              <Plus size={15} />
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && (
            <button
              type="button"
              className="btn"
              onClick={onSecondaryAction}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid var(--border-color)",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
