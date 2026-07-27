"use client";

import { useEffect } from "react";

type NotificationToastProps = {
  title: string;
  message: string;
  sender: string;
  onAction?: () => void;
  onClose: () => void;
};

export function NotificationToast({ title, message, sender, onAction, onClose }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        minWidth: "320px",
        maxWidth: "400px",
        background: "#ffffff",
        color: "#182521",
        borderLeft: "4px solid #18a47a",
        borderRadius: "12px",
        padding: "14px 18px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        animation: "slideIn 0.3s ease",
        fontFamily: "var(--font-sans, system-ui)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>📩</span>
          <strong style={{ fontSize: "13px", color: "#16251f" }}>{title}</strong>
        </div>
        <button
          onClick={onClose}
          style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "#88958f",
            fontSize: "16px",
            fontWeight: "bold"
          }}
        >
          ×
        </button>
      </div>

      <small style={{ color: "#18a47a", fontWeight: "bold", fontSize: "11px" }}>From {sender}</small>
      <p style={{ margin: 0, fontSize: "13px", color: "#4b5752", lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {message}
      </p>

      {onAction && (
        <button
          onClick={() => {
            onAction();
            onClose();
          }}
          style={{
            alignSelf: "flex-end",
            marginTop: "6px",
            padding: "6px 12px",
            background: "#e6f7f0",
            color: "#117858",
            border: "none",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          View Message →
        </button>
      )}
    </div>
  );
}
