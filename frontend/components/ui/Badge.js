"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Sparkles, Info } from "lucide-react";

export function Badge({
  children,
  variant = "brand",
  icon = true,
  className = "",
  style = {},
  ...props
}) {
  const getIcon = () => {
    if (!icon) return null;
    switch (variant) {
      case "grounded":
      case "success":
        return <CheckCircle2 size={13} style={{ marginRight: "4px" }} />;
      case "warning":
      case "ungrounded":
        return <AlertTriangle size={13} style={{ marginRight: "4px" }} />;
      case "brand":
        return <Sparkles size={13} style={{ marginRight: "4px" }} />;
      case "info":
        return <Info size={13} style={{ marginRight: "4px" }} />;
      default:
        return null;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "grounded":
      case "success":
        return {
          background: "rgba(67, 48, 117, 0.45)",
          color: "#FAFAFA",
          border: "1px solid rgba(165, 140, 244, 0.4)",
        };
      case "warning":
      case "ungrounded":
        return {
          background: "rgba(67, 48, 117, 0.25)",
          color: "#A58CF4",
          border: "1px solid rgba(165, 140, 244, 0.25)",
        };
      case "error":
        return {
          background: "rgba(67, 48, 117, 0.5)",
          color: "#FAFAFA",
          border: "1px solid rgba(165, 140, 244, 0.5)",
        };
      case "brand":
      default:
        return {
          background: "rgba(67, 48, 117, 0.3)",
          color: "#A58CF4",
          border: "1px solid rgba(165, 140, 244, 0.3)",
        };
    }
  };

  return (
    <span
      className={`badge badge-${variant} ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.75rem",
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: "9999px",
        letterSpacing: "0.02em",
        ...getVariantStyles(),
        ...style,
      }}
      {...props}
    >
      {getIcon()}
      {children}
    </span>
  );
}
