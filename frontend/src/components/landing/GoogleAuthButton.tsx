import type { CSSProperties } from "react";
import { signInWithGoogle } from "@/lib/auth";
import { GoogleIcon } from "@/components/ui/icons/GoogleIcon";

const buttonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 24px",
  marginBottom: "48px",
  cursor: "pointer",
  transition: "all 200ms ease",
  background: "rgba(255,255,255,0.10)",
  border: "0.5px solid rgba(255,255,255,0.25)",
  borderRadius: "var(--radius-xl)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  boxShadow:
    "inset 0 1.5px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.4)",
  color: "var(--text-primary)",
  fontSize: "15px",
  fontWeight: 500,
};

export function GoogleAuthButton() {
  return (
    <button
      onClick={signInWithGoogle}
      className="hover:opacity-90"
      style={buttonStyle}
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );
}
