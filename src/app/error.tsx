"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>Something went wrong!</h2>
      <p style={{ color: "red", maxWidth: "600px" }}>{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={() => reset()}
        style={{ padding: "0.5rem 1rem", marginTop: "1rem", cursor: "pointer" }}
      >
        Try again
      </button>
      <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#666" }}>
        <strong>Note for developers:</strong> If you recently updated the database schema, please ensure you have run <code>npx prisma db push</code> and <code>npx prisma generate</code> in your terminal.
      </p>
    </div>
  );
}
