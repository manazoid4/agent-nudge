# Design System

## Direction

The desktop is a restrained operations console used under sustained attention on a Windows workstation. Near-black neutral surfaces reduce glare; deep cultivated green anchors the brand; brighter signal-mint marks healthy/actionable states; coral is reserved for conflicts and failures. The public landing page uses the same identity with more open white space and an actual product specimen.

## Palette

All implementation colors use OKLCH.

- Background: `oklch(0.09 0 0)`
- Surface: `oklch(0.14 0.01 150)`
- Raised surface: `oklch(0.19 0.012 150)`
- Ink: `oklch(0.96 0.008 150)`
- Muted: `oklch(0.73 0.018 150)`
- Primary cultivated green: `oklch(0.40 0.106 150)`
- Signal mint: `oklch(0.78 0.16 150)`
- Conflict coral: `oklch(0.67 0.19 28)`
- Warning amber: `oklch(0.79 0.15 82)`
- Rule: `oklch(0.30 0.018 150)`

## Typography

- Product UI: Aptos/Segoe UI/system sans, compact fixed scale.
- Evidence, IDs, paths, and scores: Cascadia Mono/Consolas.
- Marketing display: system sans at heavy weight with disciplined line breaks; no novelty display font.

## Components

- 10px maximum panel radius, 8px controls, pills only for compact states.
- Solid rules without soft wide shadows.
- Navigation, buttons, filters, inputs, and feedback controls share one vocabulary.
- Nudge rows use full background state and leading icon—not colored side stripes.
- Loading uses skeleton structure; empty states teach the next action.

## Motion

150–220ms state transitions using ease-out-quart. Motion communicates connection, delivery, acknowledgement, or view changes. Reduced-motion mode removes transforms and animated progress.

## Responsive Behavior

Desktop shell uses a collapsible rail and two-column content above 980px. Below that, navigation becomes a horizontal strip and evidence moves below the inbox. Public marketing sections reflow without changing reading order.
