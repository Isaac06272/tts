# Design

<!-- impeccable:design-schema 1 -->

## Mode

Operate — the visitor completes a task (generate speech, transcribe audio, review history). Scanability, consistency, native expectations, and the real usage scene outrank expression.

## Color Strategy

Restrained — neutrals plus one accent. The accent carries ~15% of the surface. Primary = cyan-500 (199 89% 48%) for technical precision. Semantic state tokens derived from primary: success = emerald, warning = amber, error = red-500, info = cyan.

Dark mode: charcoal base (224 71% 4%), surface elevated (224 71% 8%), muted surface (224 71% 12%). Light mode: white base, surface (220 14% 96%), muted (220 14% 92%).

## Typography

Single family: **Geist** (system fallback: ui-sans-serif, system-ui, -apple-system). One family carries headings, body, labels, data, buttons.

Scale (fixed rem):
- display: 2.25rem / 1.1 leading / -0.02em tracking
- h1: 1.875rem / 1.2 leading / -0.01em
- h2: 1.5rem / 1.3 leading / 0
- h3: 1.25rem / 1.4 leading / 0
- body-lg: 1.125rem / 1.6 leading / 0
- body: 1rem / 1.6 leading / 0
- body-sm: 0.875rem / 1.5 leading / 0
- caption: 0.75rem / 1.5 leading / 0.02em
- mono: 0.875rem / 1.6 leading / 0 (JetBrains Mono fallback)

## Spacing

Base unit: 4px (0.25rem). Rhythm: 1, 2, 3, 4, 6, 8, 12, 16.
- Tight groups: gap-2 (8px)
- Component padding: p-4 (16px) / p-6 (24px)
- Section separation: gap-8 (32px) / gap-12 (48px)
- Container max-width: 72rem (1152px)
- Content measure: 65ch max for prose

## Depth

- surface: 0 1px 2px -1px rgb(0 0 0 / 0.05), 0 1px 3px -1px rgb(0 0 0 / 0.08)
- surface-elevated: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
- surface-overlay: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
- focus ring: 0 0 0 2px var(--primary), 0 0 0 4px var(--background)

Dark mode shadows use rgb(0 0 0 / 0.3) base with higher opacity.

## Motion

One authored moment: panel enter (slide up + fade, 150ms ease-out). No entrance on every section. Micro-interactions: button press (scale 0.98, 80ms), input focus (ring expand 100ms), toast slide (200ms). Reduced motion respected (instant).

## Components

**Button**: 3 variants (primary, secondary, ghost), 3 sizes (sm, md, lg). Primary = filled accent. Secondary = outlined. Ghost = no border, hover surface. Disabled = 0.4 opacity, no cursor change.

**Input**: Single style. Border = --border. Focus = ring-2 --primary. Error = border-error + error message below. Label above, not placeholder-only.

**Select**: Native select styled to match input. Chevron from lucide.

**Card**: surface, rounded-xl, border. Hover on interactive cards: shadow-elevated.

**Tab**: Underline indicator (primary), no background. Active = primary text, inactive = muted-foreground.

**Table**: Striped rows, sticky header. Hover row = surface-elevated.

**Toast**: Top-right, slide in, auto-dismiss 4s. Action button if needed.

**Empty state**: Centered icon (1.5rem), headline, body, primary action. No illustration.

**Loader**: Spinner (primary) for inline. Skeleton for cards (pulse, surface → muted).

## Browser Surfaces

- ::selection: bg-primary/30 (light), bg-primary/20 (dark)
- ::placeholder: muted-foreground at 0.6 opacity
- Scrollbar: 8px track (transparent), thumb (border at 0.3), hover (border at 0.5)
- Focus-visible: ring-2 ring-primary ring-offset-2 ring-offset-background
- Input caret: primary

## Icons

Lucide React, 16px (inline), 20px (buttons), 24px (empty states). Stroke width 2.

## Copy Voice

Technical, precise, utility-first. Imperative for actions ("Generate", "Transcribe", "Copy", "Download"). Descriptive for state ("Generating...", "Transcribing...", "No generations yet"). No marketing fluff.

## Breakpoints

- Mobile: < 640px (single column, stacked)
- Tablet: 640px–1024px (2-col where appropriate)
- Desktop: > 1024px (3-col player/transcript, sidebar history)

## Layout

Header: sticky, 56px tall, border-bottom, backdrop-blur, surface/95.
Main: container mx-auto px-4 py-8, max-w-6xl.
Grid: lg:grid-cols-12. Generate form: 12-col. Player: 8-col. Transcript: 4-col (stacked on mobile). History sidebar: 12-col full width on mobile, fixed 320px on desktop.

## Accessibility

- Semantic HTML5: header, main, section, article, aside, nav, button, form, label
- ARIA: aria-live="polite" for transcript highlights, aria-label on icon buttons
- Keyboard: Tab order logical, focus visible, Space/Enter on buttons, arrows in select
- Color: never sole indicator (always with text/icon/shape)
- Reduced motion: prefers-reduced-motion disables all transitions