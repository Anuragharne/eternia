"use client";

import React from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span className="spinner" style={{ width: "16px", height: "16px", border: "2px solid rgba(165,140,244,0.3)", borderTopColor: "#FAFAFA", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
