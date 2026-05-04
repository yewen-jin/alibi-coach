# alibi design system

Single source of truth: `app/globals.css` + Tailwind v4 theme. Do not introduce inline `style={}` objects for colors, surfaces, or shadows — always use the classes below.

---

## color tokens

Defined in `app/globals.css` under `:root` and `@theme inline`.

| Token | Hex | Use |
|---|---|---|
| `alibi-ink` / `--foreground` | `#162044` | Primary text, headings |
| `alibi-blue` / `--alibi-blue` | `#3253C7` | Brand primary, active states, h1 color |
| `alibi-pink` / `--alibi-pink` | `#BF7DAD` | Accent, stop button, hover state |
| `alibi-teal` / `--alibi-teal` | `#43849D` | Secondary text, labels, muted foreground |
| `alibi-lavender` / `--alibi-lavender` | `#93A5E4` | Borders, chips, chart fills |
| `background` | `#F8FAFF` | Page background (set on `<html>` via gradient) |

### semantic usage
- **Headings (h1):** `text-alibi-blue font-black tracking-tight`
- **Headings (h2):** `text-alibi-ink font-black tracking-tight`
- **Body text:** `text-alibi-ink` or `text-alibi-teal` for secondary
- **Muted / label text:** `text-alibi-teal/60` or `text-alibi-teal/70`
- **Borders:** `border-alibi-blue/10` (light) · `border-alibi-blue/15` (standard) · `border-alibi-lavender/45` (inputs)
- **Hover accent:** `hover:text-alibi-pink` · `hover:border-alibi-pink`

> Chart and data-viz components (`dashboard/`) may reference hex literals directly in inline `style` props where Tailwind cannot be used for dynamic computed values. The same hex values apply — no other palette.

---

## surface components

All defined in `app/globals.css` under `@layer components`.

### `.alibi-card`
Main panel surface. Use for cards, sections, feature tiles, info panels.
```
rounded-3xl border border-alibi-blue/15 bg-white/75 shadow-[0_18px_45px_rgba(50,83,199,0.16)] backdrop-blur-xl
```

### `.alibi-card-pop`
Elevated card with bottom shadow. Use for the primary hero card on each page (timer card, empty-state callout).
```
rounded-3xl border-2 border-alibi-blue/20 bg-white/85 shadow-[0_20px_0_rgba(147,165,228,0.22),0_28px_55px_rgba(50,83,199,0.16)] backdrop-blur-xl
```

### `.alibi-pill`
Full-radius glass surface. Use for navigation bars (both the top nav and landing nav).
```
rounded-full border border-white/70 bg-white/75 shadow-[0_12px_28px_rgba(50,83,199,0.14)] backdrop-blur-xl
```

### `.alibi-inset`
Inset paper surface. Use for message areas, quoted/receipt blocks, mission statements — anything that sits inside a card.
```
rounded-[20px] border border-alibi-blue/15 bg-gradient-to-b from-white/90 to-alibi-lavender/15 shadow-[inset_0_2px_8px_rgba(50,83,199,0.08)]
```

---

## interactive components

### `.alibi-button-primary`
Filled blue button. Primary actions: start tracking, save, open tracker.
```
rounded-2xl bg-alibi-blue px-4 font-bold text-white shadow-[0_10px_22px_rgba(50,83,199,0.28)] transition hover:-translate-y-0.5 hover:bg-alibi-pink disabled:translate-y-0 disabled:opacity-55
```
Override `rounded-2xl` with `rounded-full` for pill-shaped CTAs on landing/marketing pages.

### `.alibi-button-secondary`
Ghost button. Secondary actions: sign in, see dashboard, cancel.
```
rounded-2xl border-2 border-alibi-lavender/45 bg-white/75 px-4 font-bold text-alibi-blue transition hover:-translate-y-0.5 hover:border-alibi-pink hover:text-alibi-pink disabled:translate-y-0 disabled:opacity-55
```

### `.alibi-input`
Text input / select. Standard form fields.
```
rounded-2xl border-2 border-alibi-lavender/45 bg-white/80 px-3 text-base text-alibi-ink outline-none transition focus:border-alibi-pink focus:ring-4 focus:ring-alibi-pink/15
```

### `.alibi-chip`
Inline tag/badge. Used for hashtags and category pills.
```
rounded-full bg-alibi-lavender/25 px-2.5 py-1 font-mono text-xs font-bold text-alibi-blue
```

---

## typography components

### `.alibi-label`
Small uppercase monospace label. Use for section badges ("demo", "the docs"), tab labels, status indicators.
```
font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal
```

### Heading scale

| Level | Classes | Example use |
|---|---|---|
| Page h1 | `text-[1.8rem] font-black tracking-tight text-alibi-blue` | Dashboard, tracker page titles |
| Page h1 (smaller) | `text-[1.6rem] font-black tracking-tight text-alibi-blue` | Docs page title |
| Section h2 | `text-2xl font-black tracking-tight text-alibi-ink` | "what alibi does" |
| Card h3 | `text-[14px] font-semibold tracking-tight text-alibi-ink` | Feature card titles |
| Hero h1 | `text-4xl font-black tracking-tight text-alibi-ink sm:text-5xl md:text-6xl` | Landing page |

### Body scale

| Use | Classes |
|---|---|
| Primary body | `text-base text-alibi-ink` (17px base via `body`) |
| Secondary body | `text-[15px] leading-relaxed text-alibi-teal` |
| Small body | `text-[13px] leading-relaxed text-alibi-teal` |
| Mono label | `font-mono text-xs text-alibi-teal/70` |
| Footer | `text-sm font-semibold tracking-[0.04em] text-alibi-teal` |

---

## layout

- Page wrapper: `alibi-page` (`min-h-screen text-alibi-ink`)
- Max content width: `max-w-[1280px]` (app pages) · `max-w-6xl` (landing hero) · `max-w-5xl` (landing features)
- Standard page padding: `p-8` (desktop) · `px-4 py-4 sm:px-6 lg:px-8` (tracker)
- Card gap: `gap-5` or `gap-6` between top-level sections

---

## animations

| Class | Effect |
|---|---|
| `.alibi-soft-rise` | New messages / list items fade up (200ms) |
| `.alibi-fade-in` | Transient confirmations (240ms) |
| `.alibi-record-pulse` | Voice button pulse while recording (2s loop) |
| `.alibi-listen-dot` | Listening indicator breath (2.4s loop) |

---

## deprecated

`lib/ui-styles.ts` exports (`GLASS_PANEL_STYLE`, `GLASS_PILL_STYLE`, `PAPER_INSET_STYLE`, `PRIMARY_BUTTON_STYLE`, `ALIBI`) are no longer used in any rendered page or component. Do not reference them in new code. The equivalents are:

| Legacy | Replacement |
|---|---|
| `GLASS_PANEL_STYLE` | `.alibi-card` |
| `GLASS_PILL_STYLE` | `.alibi-pill` |
| `PAPER_INSET_STYLE` | `.alibi-inset` |
| `PRIMARY_BUTTON_STYLE` | `.alibi-button-primary` |
| `ALIBI.blue` / `ALIBI.pink` etc. | `text-alibi-blue` / `text-alibi-pink` etc. |
