import React from "react";

export default function LoadingFallback() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "55vh",
        width: "100%",
        gap: "14px",
      }}
    >
      <div
        className="spinner"
        style={{
          width: "36px",
          height: "36px",
          border: "3px solid rgba(37, 99, 235, 0.15)",
          borderTopColor: "var(--primary, #2563EB)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span
        style={{
          fontSize: "13px",
          color: "var(--text-secondary, #64748B)",
          fontWeight: "500",
          letterSpacing: "0.2px",
        }}
      >
        Loading...
      </span>
    </div>
  );
}
