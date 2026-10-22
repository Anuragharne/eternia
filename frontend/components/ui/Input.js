"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Input({
  label,
  type = "text",
  id,
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  className = "",
  disabled = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="form-group" style={{ marginBottom: "16px" }}>
      {label && (
        <label
          htmlFor={id || name}
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--lavender, #A58CF4)",
            marginBottom: "6px",
          }}
        >
          {label} {required && <span style={{ color: "var(--lavender, #A58CF4)" }}>*</span>}
        </label>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={id || name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`input-field ${error ? "input-error" : ""} ${className}`.trim()}
          style={{
            width: "100%",
            height: "44px",
            padding: isPassword ? "12px 40px 12px 16px" : "12px 16px",
            background: "var(--jet-black, #0D0D0D)",
            border: error
              ? "1px solid #A58CF4"
              : "1px solid rgba(165, 140, 244, 0.25)",
            borderRadius: "12px",
            color: "var(--soft-white, #FAFAFA)",
            fontSize: "0.9375rem",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "12px",
              background: "transparent",
              border: "none",
              color: "rgba(250, 250, 250, 0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p style={{ fontSize: "0.75rem", color: "#A58CF4", marginTop: "4px" }}>
          {error}
        </p>
      ) : helperText ? (
        <p style={{ fontSize: "0.75rem", color: "rgba(250, 250, 250, 0.6)", marginTop: "4px" }}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
