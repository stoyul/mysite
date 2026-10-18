---
name: "Мастер времени — Time Observatory"
description: "One observatory world for the full game and its supporting tools."
colors:
  world-bg: "#08070e"
  world-surface: "#120d1b"
  world-raised: "#21132b"
  world-ink: "#f8f1e8"
  world-muted: "#cbbbdc"
  world-gold: "#e9c78b"
  world-pink: "#f349ae"
  world-rule: "#b99b683f"
  action-gold: "#e7c286"
  action-ink: "#1c1022"
  action-hover: "#f4d89e"
  button-surface: "#17101f"
  button-border: "#79588c"
  field-surface: "#100b18"
  field-border: "#795d89"
  focus-ring: "#f6d99f"
  decision-selected: "#42203a66"
  decision-border: "#f4cf93"
  menu-surface: "#160f21"
  menu-selected: "#41213e"
  warning-surface: "#39222c"
  warning-ink: "#ffe4ce"
  resource-joy: "#dbadce"
  resource-freedom: "#ae8bc6"
  print-paper: "#fff"
  print-ink: "#19131a"
  print-heading: "#71502f"
typography:
  display: {fontFamily: "Prata, Georgia, serif", fontSize: "clamp(52px, 5.1vw, 76px)", fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.035em"}
  headline: {fontFamily: "Prata, Georgia, serif", fontSize: "clamp(36px, 4.4vw, 62px)", fontWeight: 400, lineHeight: 1.18, letterSpacing: "-0.025em"}
  title: {fontFamily: "Prata, Georgia, serif", fontSize: "clamp(24px, 2.7vw, 36px)", fontWeight: 400, lineHeight: 1.35}
  body: {fontFamily: "Manrope, Arial, sans-serif", fontSize: "18px", lineHeight: 1.7}
  action: {fontSize: "17px", fontWeight: 800, lineHeight: 1.5}
rounded:
  action: "3px"
  world: "4px"
  orb: "50%"
spacing:
  world-space: "clamp(24px, 4vw, 56px)"
  page-gutter: "clamp(18px, 4vw, 64px)"
  mobile-gutter: "18px"
  choice-gap: "24px"
components:
  button-primary: {backgroundColor: "{colors.action-gold}", textColor: "{colors.action-ink}", rounded: "{rounded.action}", padding: "16px 25px", height: "58px", typography: "{typography.action}"}
  button-secondary: {backgroundColor: "{colors.button-surface}", textColor: "{colors.world-ink}", rounded: "{rounded.world}", padding: "12px 19px", height: "48px"}
  field: {backgroundColor: "{colors.field-surface}", textColor: "{colors.world-ink}", rounded: "{rounded.world}", padding: "12px 14px", height: "54px"}
  decision-selected: {backgroundColor: "{colors.decision-selected}"}
---

# Design System: Мастер времени

## Overview

**Creative North Star: "The Premium Time Observatory"**

The full game and supporting routes share one black, purple, fuchsia and gold observatory for a broad adult audience. Astronomical clocks, constellation portals and a faceted crystal turn attention and progress into visible objects. Large reading type and explicit decisions keep the world usable.

The owner authorized expansion across all routes; the former home/first-trial pilot boundary is superseded. This describes the local implementation, not a public deployment. Source authority: `src/world.css`, `src/keeper.css`, `src/scene-kit.mjs` and the journey, chapter, passport, encounter and report views. Physical phone and Telegram validation remain outstanding.

**Key Characteristics:** shared world menu and breadcrumbs; distinct interactive instruments; reversible preview followed by commitment; readable author practices and saved reflections.

## Colors

Frontmatter records operative root colors and recurring component literals. Gold guides actions and progress; fuchsia marks attention and concentrated light; warm white carries reading; lilac carries secondary information. Deep surfaces and translucent gold rules establish hierarchy. Resource strips add dusty pink for joy and purple for freedom. Warning surfaces use warm peach text. Print uses white paper, dark ink and brown headings.

These are the shared palette, not an exhaustive ban on illustration colors. Existing clock/crystal facets, energy cells, orbital strokes and atmospheric gradients retain their source-defined gold, purple and pink variations. No synthesized tonal ramps are shipped or documented as tokens. Consult source before introducing a new semantic color; detector advisories are not blanket exemptions.

## Typography

Prata with Georgia/serif fallback gives titles a ceremonial character; Manrope with Arial/sans-serif fallback carries controls and reading. Desktop body is 18px; scene introductions reach 19px. Mobile reading is generally 17px, with smaller metadata and navigation. Keep author text fully accessible; do not clamp practice content. Source-specific heading overrides apply to the home, attention trial, outcomes and report.

## Layout

Every route uses `keeper-app`; the shell caps at 1480px, ordinary content at 1180px, and play/rhythm sections at 1120px. Main gutters use `clamp(18px,4vw,64px)`; the home keeps its observatory composition and 4% gutters. The world menu provides supporting routes without restoring a permanent sidebar on the game start. Breadcrumbs and scene links establish location and return paths.

Breakpoints are 1000px, 650px and 360px. At mobile size, decision rows stack, reading gains space, week slots retain their board structure, month stations form two columns and the year wheel stays circular. Main primary actions are 58px, mobile primary actions 56px and the home action 60px minimum height. Safe-area and Telegram inset variables protect the shell. The six-width review completed: 456 base state/width checks plus targeted content and control checks; evidence is in PROJECT_STATUS.md and preview/full/.

## Elevation & Depth

Purple radial light and thin orbital lines provide ambient depth. Ordinary panels use flat top rules; shared primary actions have no shadow. The menu uses `0 24px 55px #0009`; the home action and crystal retain their specific shadow/glow. Selection feedback uses short transform/opacity changes, with color changes on instruments. Decorative clock hands rotate over 60s/3600s; the crystal breathes over 6s. Reduced motion disables animation, transitions and smooth scrolling while retaining the state.

## Shapes

Circular dials, constellation spheres, the faceted crystal and the seasonal wheel identify the observatory. Controls use 3px primary or 4px shared corners. Shared decisions use open rows with top/bottom rules; the first attention trial retains its distinct arched choices. Do not replace every instrument with the same card silhouette.

## Components

- **Shared shell:** world menu, active-route state, breadcrumbs, resource rails and clear return links across game and auxiliary routes.
- **Decision workbench:** inspect alternatives through `aria-pressed` preview, then explicitly commit. Costs and unavailable options stay visible. Consequence screens allow undo before advancing; histories support inspection.
- **Day instruments:** attention shield, boundaries balance beam, urgency/time window, learning crossroads, energy cells, joy constellation and completion ring respond to the choice. The brief source-of-15-minutes audit leads into the day; full author practice and reflection follow.
- **Chapter instruments:** week has seven slots; month has four rhythm stations; year has a twelve-month seasonal wheel with four turns. Preserve existing locks, rules and rewards.
- **Encounter hall:** eight independent author scenarios can be tried without changing the main run or its rewards. Its history and reflection remain separate.
- **Rhythm and planning:** edit one schedule category at a time, inspect the daily ring, and retain day/week/month planning and saved chapters.
- **Author practices:** preserve the exact 74 source cards, wording and order. Present complete text with readable spacing and expandable detail where used.
- **Report:** the book of decisions combines game observations, reflections and calendar-based real-day/week audits. Browser print supplies Save as PDF; screen controls disappear in print. Local saves are labeled as device-local.

## Do's and Don'ts

- **Do** preserve the exact 74 source cards and all game mechanics; keep simulation and real calendar calculations explicit.
- **Do** communicate selection, locks, cost, consequences and saved state in text as well as color or motion.
- **Do** keep controls usable with keyboard focus, mobile touch and reduced motion.
- **Don't** describe local persistence as server synchronization or publish without an authorized deployment step.
- **Don't** infer physical Telegram readiness from the UI bridge: ready, expand, safe insets and back navigation are implemented; physical-device testing remains separate.
- **Don't** promote unfinished verification to a pass. Source-card equality, unit/functional checks and export evidence belong in project status; the completed responsive checks and physical-device limits are recorded in PROJECT_STATUS.md.
