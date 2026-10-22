"use client";

import React from "react";

export function Card({
  children,
  className = "",
  hover = true,
  glow = false,
  style = {},
  onClick,
  ...props
}) {
  const classes = [
    "card",
    hover ? "card-hover" : "",
    glow ? "card-glow" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      onClick={onClick}
      style={{
        backgroundColor: "#0D0D0D",
        border: "1px solid rgba(165, 140, 244, 0.22)",
        borderRadius: "20px",
        padding: "24px",
        color: "#FAFAFA",
        boxShadow: "0 12px 36px rgba(13, 13, 13, 0.6)",
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
