import type { CSSProperties } from "react"

/**
 * ALIBI UI primitives.
 * Warm-cream glassmorphism palette + reusable surface styles.
 * Imported by alibi.tsx, top-nav.tsx, dashboard/*, and docs/page.tsx.
 */
export const ALIBI = {
  ink: "#2A1F14",
  inkSoft: "#6B5A47",
  inkMuted: "#A89680",
  inkFaint: "#C8B89F",
  cream: "#F4EDE0",
  paper: "#F8F1E3",
  paperEdge: "#F4ECDA",
  terracotta: "#C8553D",
  sage: "#8B9D7F",
  ochre: "#D4A574",
} as const

/** Big surface — main panels, cards, sections. */
export const GLASS_PANEL_STYLE: CSSProperties = {
  background: "rgba(255, 250, 240, 0.55)",
  backdropFilter: "blur(20px) saturate(140%)",
  WebkitBackdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  boxShadow:
    "0 8px 32px rgba(60, 40, 20, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.06)",
  borderRadius: 16,
}

/** Pill-shaped glass — used for the top nav. */
export const GLASS_PILL_STYLE: CSSProperties = {
  background: "rgba(255, 250, 240, 0.55)",
  backdropFilter: "blur(20px) saturate(140%)",
  WebkitBackdropFilter: "blur(20px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.6)",
  boxShadow:
    "0 4px 20px rgba(60, 40, 20, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
  borderRadius: 999,
}

/** Inset thermal-paper surface — used for receipts and quoted blocks. */
export const PAPER_INSET_STYLE: CSSProperties = {
  background: "linear-gradient(180deg, #F8F1E3 0%, #F4ECDA 100%)",
  borderRadius: 12,
  boxShadow:
    "inset 0 2px 6px rgba(60, 40, 20, 0.08), inset 0 -1px 0 rgba(255, 255, 255, 0.6)",
}

/** Primary terracotta button (filled). */
export const PRIMARY_BUTTON_STYLE: CSSProperties = {
  background: ALIBI.terracotta,
  boxShadow:
    "0 2px 6px rgba(200, 85, 61, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
}
