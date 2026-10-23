# NovaSonic desktop design language

## Direction: Midnight Observatory

A calm, high-precision workspace: deep charcoal-indigo surfaces, subtle ambient violet and cyan gradients, restrained highlights, generous whitespace, rounded yet crisp panels. **Professional, not sci-fi clutter.** No decorative glow may reduce text contrast.

### Visual hierarchy
- Sidebar 268px: mark, primary navigation, history, lower profile/settings.
- Content: flexible center column, maximum reading width ~850px.
- Top bar: current workspace, model chooser, offline status.
- Home: one definitive title, subtitle, four task starters, bottom anchored composer.
- Chat: high readability message flow, clear speaker identity, progressive tokens, grounded error messages.
- Model Hub: clear discovery states and runtimes, no fictional model cards.
- Responsive compact layout: sidebar collapses, controls retain labels or accessible names.

### Tokens

| Token | Dark | Light |
|---|---|---|
| Canvas | #0B0E16 | #F6F7FB |
| Surface | #121724 | #FFFFFF |
| Elevated | #1A2030 | #EEF1F7 |
| Border | #30394A | #DCE1EB |
| Primary text | #F3F6FC | #151B27 |
| Muted text | #A9B5C8 | #5B687C |
| Accent | #A897FF | #6657D8 |
| Accent soft | #26223F | #ECEAFE |
| Success | #79D9B1 | #087C54 |
| Warning | #F5C079 | #8D4B08 |

Dark and light text are designed to remain legible on their respective surfaces; avoid low-opacity foregrounds for essential content. Use system UI fonts as default; branded display typography can be optional and locally bundled later.

### Geometry and motion

8px base spacing grid; 12–20px button and card radii; clear 2px keyboard focus outline; 160–220ms ease for small interactions; honor `prefers-reduced-motion`.

### Brand vocabulary

**Nova**: intelligence, possibility, discovery. **Sonic**: responsiveness and conversational clarity. Logo concept: a concentric orbital mark with one bright active arc; must also work as a monochrome app icon. Use a locally bundled vector, never a CDN.

### Accessibility and localization

- All interactive elements have visible labels or aria-labels.
- Live streamed content must not flood a screen reader every token; announce generation state separately.
- Contrast testing for selected/hover/disabled/focus states in both themes.
- Form semantics and keyboard shortcuts; no hover-only actions.
- Locale-ready date/time formatting; avoid hard-coded country formatting.
