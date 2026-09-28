# Lumen Commons design system

## Product intent

Lumen Commons is civic infrastructure for verified, anonymous community input.
The primary job is to make a first-time resident feel safe, informed, and in
control while completing an eligibility proof in under one minute.

## Direction: Nordic civic minimalism

Calm public-service clarity, warm human surfaces, and rigorous information
hierarchy. Avoid crypto tropes, glassmorphism, neon gradients, flag motifs,
ornamental folklore, and bureaucratic severity.

## Tokens

- Ink `#18342f`, muted ink `#4f6661`, paper `#f5f1e8`, white `#fffdf8`.
- Civic blue `#2e5d70`, moss `#5d7052`, amber `#ce7b35`, danger `#a34843`.
- Typography: system sans stack with `Arial`, `Helvetica Neue`, sans-serif.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64, 88.
- Radii: 8px controls, 14px cards, 24px feature surfaces, 999px pills.
- Borders: 1px solid `rgba(24,52,47,.18)`; strong separators use 2px.
- Shadows: subtle, cool-neutral, never more than two layers.

## Layout and components

- Desktop: 72px top utility bar, centered 1180px shell, 7/5 main split.
- Mobile: one column, persistent bottom action dock, 16px gutters.
- Cards have clear labels, generous white space, and visible state borders.
- Primary actions are deep ink with paper text. Secondary actions are outlined.
- Privacy explanations use paired “stays here / goes public” columns.

## Motion

180–260ms transitions, spring only for proof progress and confirmation. Motion
communicates state changes, never decoration. `prefers-reduced-motion` removes
translation and sets durations near zero.

## Accessibility

Minimum 4.5:1 text contrast; 3:1 non-text UI contrast. Every interactive item
has a 3px amber focus ring with 2px offset. Status is never color-only. Touch
targets are at least 44px. Live proof and wallet updates use polite live regions.
