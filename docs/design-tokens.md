# Design Tokens

OpenTristam's UI styling now uses CSS custom properties as a single source of truth for shared values.

## Colors

- `--color-bg-app`, `--color-bg-panel`, `--color-bg-panel-alt`
- `--color-bg-inset`, `--color-bg-inset-soft`, `--color-bg-callout`, `--color-rule`
- `--color-gold-primary`, `--color-gold-soft`, `--color-gold-border`, `--color-gold-accent`, `--color-gold-title`
- `--color-text-primary`, `--color-text-muted`, `--color-text-soft`, `--color-text-faint`, `--color-text-strong`
- `--color-danger-primary`, `--color-danger-soft`
- `--color-success-border`, `--color-success-text`
- `--color-focus-ring`

## Spacing

- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 12px
- `--space-lg`: 16px
- `--space-xl`: 24px
- `--touch-target-min`: 44px

## Motion

- `--transition-fast`: 0.15s emphasized easing
- `--transition-normal`: 0.25s emphasized easing
- `--transition-slow`: 0.4s emphasized easing

## Usage rules

- Prefer tokens over hard-coded values in component and layout styles.
- Keep semantic token names (purpose-oriented) over literal names.
- Update this file when introducing new shared tokens.
