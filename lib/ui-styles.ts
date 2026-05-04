import type { CSSProperties } from "react"

/**
 * ALIBI UI primitives.
 * v2 palette mirrors STYLES.md. New surfaces should prefer Tailwind
 * component classes in app/globals.css; these objects remain for legacy v1.
 */
export const ALIBI = {
  ink: "#162044",
  inkSoft: "#3253C7",
  inkMuted: "#43849D",
  inkFaint: "#93A5E4",
  cream: "#F8FAFF",
  paper: "#FFFFFF",
  paperEdge: "#EAF0FF",
  pink: "#BF7DAD",
  blue: "#3253C7",
  teal: "#43849D",
  lavender: "#93A5E4",
  terracotta: "#BF7DAD",
  sage: "#43849D",
  ochre: "#93A5E4",
} as const

/** Big surface — main panels, cards, sections. */
export const GLASS_PANEL_STYLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.76)",
  backdropFilter: "blur(20px) saturate(140%)",
  WebkitBackdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(50, 83, 199, 0.16)",
  boxShadow:
    "0 18px 45px rgba(50, 83, 199, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
  borderRadius: 24,
}

/** Pill-shaped glass — used for the top nav. */
export const GLASS_PILL_STYLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.78)",
  backdropFilter: "blur(20px) saturate(140%)",
  WebkitBackdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.78)",
  boxShadow: "0 12px 28px rgba(50, 83, 199, 0.14)",
  borderRadius: 999,
}

/** Inset thermal-paper surface — used for receipts and quoted blocks. */
export const PAPER_INSET_STYLE: CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(147,165,228,0.16) 100%)",
  border: "1px solid rgba(50, 83, 199, 0.14)",
  borderRadius: 20,
  boxShadow: "inset 0 2px 8px rgba(50, 83, 199, 0.08)",
}

/** Primary terracotta button (filled). */
export const PRIMARY_BUTTON_STYLE: CSSProperties = {
  background: ALIBI.blue,
  boxShadow: "0 10px 22px rgba(50, 83, 199, 0.28)",
}
