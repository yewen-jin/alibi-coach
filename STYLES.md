# alibi design system

Single source of truth: `app/globals.css` + Tailwind v4 theme. Do not introduce inline `style={}` objects for colors, surfaces, or shadows — always use the classes below.

---

## design rules

### no glass effect
Do **not** use `backdrop-blur`, semi-transparent backgrounds (`bg-white/75`, `bg-white/80`), or `backdrop-filter`. Surfaces are solid white (`bg-white`) against the colorful page gradient.

### border: always 1px
Always use `border` (1px). Never use `border-2`. Opacity adjusts weight: `border-alibi-blue/12` for cards, `border-alibi-lavender/40` for inputs and secondary buttons.

### shadow system (lift + press)
Surfaces create depth through shadows, not glass blur:

| Effect | Use | Pattern |
|---|---|---|
| **Lift** | Cards, nav, block items | `shadow-[0_1px_3px_rgba(50,83,199,0.06),0_6px_20px_rgba(50,83,199,0.09)]` |
| **Pop** | Primary focus card | `shadow-[0_2px_6px_rgba(50,83,199,0.08),0_12px_32px_rgba(50,83,199,0.12)]` |
| **Press** | Inset areas, inputs | `shadow-[inset_0_2px_6px_rgba(50,83,199,0.08)]` or `shadow-[inset_0_1px_3px_rgba(50,83,199,0.07)]` |
| **Button** | Filled buttons | `shadow-[0_2px_6px_rgba(50,83,199,0.20),0_4px_14px_rgba(50,83,199,0.16)]` |

Use Lift + Press together to create a "card floating above a recessed area" reading.

### border radius scale

| Scale | Size | Use |
|---|---|---|
| `rounded-3xl` | 24px | Primary cards, nav pill, large panels |
| `rounded-2xl` | 16px | Buttons, inputs, dropdowns, block items, form elements |
| `rounded-full` | pill | Nav links, icon buttons, chips, color dots |

Do not use `rounded-xl` (12px) — it sits between scales and creates inconsistency.

---

## color tokens

Defined in `app/globals.css` under `:root` and `@theme inline`.

| Token | Hex | Use |
|---|---|---|
| `alibi-ink` | `#162044` | Primary text, h2, body |
| `alibi-blue` | `#3253C7` | Brand primary, h1, active states |
| `alibi-pink` | `#BF7DAD` | Accent, stop button, hover state |
| `alibi-teal` | `#43849D` | Secondary text, labels, muted foreground |
| `alibi-lavender` | `#93A5E4` | Borders, chips, chart fills |
| `background` | `#F8FAFF` | Page background (gradient on `<html>`) |

**Semantic usage:**
- h1: `text-alibi-blue font-black tracking-tight`
- h2: `text-alibi-ink font-black tracking-tight`
- Labels/muted: `text-alibi-teal` or `text-alibi-teal/60`
- Borders: `border-alibi-blue/12` (cards) · `border-alibi-lavender/40` (inputs/buttons)
- Hover accent: `hover:text-alibi-pink` · `hover:border-alibi-pink`

> Chart and data-viz components may use hex literals in inline `style` props for dynamic computed values. Same palette, no new colors.

---

## surface components

All defined in `app/globals.css` under `@layer components`.

### `.alibi-card`
Main panel. Cards, sections, feature tiles, info panels.
```
rounded-3xl border border-alibi-blue/12 bg-white
shadow-[0_1px_3px_rgba(50,83,199,0.06),0_6px_20px_rgba(50,83,199,0.09)]
```

### `.alibi-card-pop`
Elevated card. The primary focus element on a page (timer card, hero section).
```
rounded-3xl border border-alibi-blue/15 bg-white
shadow-[0_2px_6px_rgba(50,83,199,0.08),0_12px_32px_rgba(50,83,199,0.12)]
```

### `.alibi-pill`
Full-radius surface. Navigation bars — top nav and landing nav.
```
rounded-full border border-alibi-blue/12 bg-white
shadow-[0_1px_3px_rgba(50,83,199,0.06),0_6px_20px_rgba(50,83,199,0.09)]
```

### `.alibi-inset`
Recessed surface. Chat message areas, receipt/quoted blocks, inset panels — anything that sits inside a card and should read as pressed-in.
```
rounded-[20px] border border-alibi-blue/10 bg-alibi-lavender/10
shadow-[inset_0_2px_6px_rgba(50,83,199,0.08)]
```

---

## interactive components

### `.alibi-button-primary`
Filled blue button. Primary actions: start tracking, save, sign up.
```
rounded-2xl bg-alibi-blue px-4 font-bold text-white transition
shadow-[0_2px_6px_rgba(50,83,199,0.20),0_4px_14px_rgba(50,83,199,0.16)]
hover:-translate-y-0.5 hover:bg-alibi-pink disabled:translate-y-0 disabled:opacity-55
```
Override `rounded-2xl` → `rounded-full` for pill CTAs on landing/marketing pages.

### `.alibi-button-secondary`
Ghost button. Secondary actions: sign in, cancel, navigate.
```
rounded-2xl border border-alibi-lavender/40 bg-white px-4 font-bold text-alibi-blue transition
shadow-[0_1px_3px_rgba(50,83,199,0.06),0_3px_8px_rgba(50,83,199,0.07)]
hover:-translate-y-0.5 hover:border-alibi-pink hover:text-alibi-pink disabled:translate-y-0 disabled:opacity-55
```

### `.alibi-input`
Text input / select. Standard form fields. Inner shadow creates a recessed, pressed-in feel.
```
rounded-2xl border border-alibi-lavender/40 bg-white px-3 text-base text-alibi-ink outline-none transition
shadow-[inset_0_1px_3px_rgba(50,83,199,0.07)]
focus:border-alibi-pink focus:ring-2 focus:ring-alibi-pink/20
```

### `.alibi-chip`
Inline tag/badge. Hashtags, category pills.
```
rounded-full bg-alibi-lavender/20 px-2.5 py-1 font-mono text-xs font-bold text-alibi-blue
```

---

## typography components

### `.alibi-label`
Small uppercase monospace label. Section badges, tab labels, status indicators.
```
font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal
```

### Heading scale

| Level | Classes |
|---|---|
| Page h1 | `text-[1.8rem] font-black tracking-tight text-alibi-blue` |
| Section h2 | `text-2xl font-black tracking-tight text-alibi-ink` |
| Card h3 | `text-[14px] font-semibold tracking-tight text-alibi-ink` |
| Hero h1 | `text-4xl font-black tracking-tight text-alibi-ink sm:text-5xl md:text-6xl` |

### Body scale

| Use | Classes |
|---|---|
| Primary body | `text-base text-alibi-ink` (17px via `body`) |
| Secondary body | `text-[15px] leading-relaxed text-alibi-teal` |
| Small | `text-[13px] leading-relaxed text-alibi-teal` |
| Mono label | `font-mono text-xs text-alibi-teal/70` |

---

## layout

- Page wrapper: `alibi-page` (`min-h-screen text-alibi-ink`)
- Max width: `max-w-[1280px]` (app pages) · `max-w-6xl` (landing hero)
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

`lib/ui-styles.ts` is no longer used. Do not reference in new code.

| Legacy | Replacement |
|---|---|
| `GLASS_PANEL_STYLE` | `.alibi-card` |
| `GLASS_PILL_STYLE` | `.alibi-pill` |
| `PAPER_INSET_STYLE` | `.alibi-inset` |
| `PRIMARY_BUTTON_STYLE` | `.alibi-button-primary` |
| `ALIBI.blue` etc. | `text-alibi-blue` etc. |
