# iOS Safari `position: fixed` Sticky Bar Drift — Root Cause & Fix

> Discovered and resolved on the Waypoint Franchise Advisors site (March 2025).
> Applies to ANY Next.js / React project with a mobile sticky bottom bar.
> Also documented in: [`Franscale1922/local-websites/docs/ios-safari-position-fixed-fix.md`](https://github.com/Franscale1922/local-websites/blob/main/docs/ios-safari-position-fixed-fix.md)

## The Symptom

A `position: fixed; bottom: 0` sticky bar drifts to the **middle of the viewport** when scrolling down on iOS Safari, and snaps back to the bottom when scrolling up. Works fine on desktop and Chrome on desktop — iOS Safari specific.

## Root Cause #1: `overflow-x` on `<body>` (fixes Chrome + Safari)

**CSS Spec trap + Safari Bug #745729 (unresolved through Safari 18.3):**

Setting `overflow-x: clip` (or `hidden`) on `<body>` causes Safari to treat the body as a **scroll container**. When body is the scroll container, `position: fixed` resolves relative to the **body**, not the viewport — causing drift.

This is NOT obvious because `overflow-x: clip` was introduced specifically to be "safe" vs `overflow-x: hidden`. But:
1. CSS spec § Overflow: if `clip` is set on one axis without explicitly setting the other to `clip` or `visible`, the value computes to `hidden`.
2. Safari Bug #745729: Safari also incorrectly applies `clip` to the Y-axis.

**Fix:** Move `overflow-x: clip` off `<body>` onto an **inner wrapper div**.

```css
/* globals.css — WRONG */
body {
  overflow-x: clip; /* ❌ breaks position:fixed in Safari */
}

/* globals.css — CORRECT */
body {
  /* No overflow property on body */
}
```

```tsx
/* In your layout wrapper — CORRECT */
<div style={{ overflowX: "clip" }}>  {/* ✅ safe on inner div */}
  {children}
</div>
```

---

## Root Cause #2: WebKit Bug #297779 (Safari only — persists even after RC1 is fixed)

After fixing Root Cause #1, Chrome was fixed but **Safari still drifted**.

**WebKit Bug #297779** (Apple internal: `rdar://problem/159439271`): The compositor GPU layer for `position: fixed` elements drifts during scroll direction changes on iOS Safari. This is a **system-level rendering engine bug** — it happens even with correct CSS containing blocks and is unrelated to JavaScript.

Characteristics:
- Drift occurs specifically when **scroll direction reverses** (down = middle, up = back to bottom)
- Browser DevTools reports the element at the **correct position** — only the GPU layer is wrong ("phantom rendering")
- Partially patched in iOS 26.1 but still affects many devices/iOS versions

**Fix:** Lock `html` and `body` to stable viewport dimensions on iOS only using a feature-detection query. This stabilizes the compositor's reference frame.

```css
/* globals.css */
@supports (-webkit-touch-callout: none) {
  /* iOS Safari only */
  html {
    height: 100%;
    overflow: hidden; /* pins layout viewport */
  }
  body {
    height: 100%;
    overflow-y: auto; /* body becomes the scroll container */
    -webkit-overflow-scrolling: touch; /* restores momentum scrolling */
  }
}
```

> **Important side effect:** When body is the scroll container, `window.scrollY = 0`
> and `window.scroll` events don't fire. Use `document.body.scrollTop` instead (see implementation below).

---

## Root Cause #3: `visualViewport` API is the wrong tool

Multiple attempts were made using `window.visualViewport` to correct the bar position with `translateY` or dynamic `bottom` values. **All failed.** Why:

- `vv.resize` fires only **after** the URL bar animation completes — misses all intermediate frames
- `vv.scroll` fires on **every pan gesture** (pinch-zoom panning, not URL bar) and corrupts the `bottom` calculation during normal scroll
- The API was designed for **keyboard and pinch-zoom** scenarios, not URL bar transitions

**Do not use `visualViewport` for sticky bottom bars on iOS.**

---

## Complete Implementation (Next.js App Router + React)

### `globals.css`

```css
body {
  /* NO overflow property on body — any overflow creates a scroll container
     in Safari, breaking viewport-relative position:fixed. */
  background: ...;
  font-family: ...;
}

@supports (-webkit-touch-callout: none) {
  html { height: 100%; overflow: hidden; }
  body { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
}
```

### Layout wrapper (marketing or root layout)

```tsx
/* Move overflow-x clipping here — NOT on body */
<div style={{ overflowX: "clip", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
  {children}
</div>
```

### Add `viewport-fit=cover` (required for safe-area-inset-bottom)

```tsx
// layout.tsx
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

### Sticky Bar Component (React + portal)

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function MobileStickyBar() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // When the iOS @supports fix is active, body is the scroll container.
    // window.scrollY = 0 always on iOS. Read document.body.scrollTop instead.
    const getScrollY = () => document.body.scrollTop || window.scrollY || 0;

    const handleScroll = () => {
      setVisible(getScrollY() > window.innerHeight * 0.8);
    };

    // Desktop / Chrome: scroll fires on window
    window.addEventListener("scroll", handleScroll, { passive: true });
    // iOS Safari: body is the scroll container, scroll fires on body
    document.body.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={barRef}
      className="sm:hidden" // hide on desktop via Tailwind
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 250ms ease",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        // ... background color, border etc
      }}
    >
      {/* CTA buttons */}
    </div>,
    document.body // portal to body to escape any ancestor stacking contexts
  );
}
```

---

## What NOT to Do (9 Failed Approaches)

| Approach | Why It Failed |
|----------|--------------|
| `translateZ(0)` / GPU hints on the bar | Doesn't fix viewport math |
| Remove `backdrop-filter` on ancestors | Unrelated |
| `createPortal` to `document.body` alone | Correct, but incomplete without RC1+RC2 fix |
| `overflow-x: clip` on body | This IS the bug (RC1) |
| `visualViewport` + `vv.resize` + `transform: translateY` | Fires after animation ends; jank |
| `visualViewport` + `vv.scroll` + `bar.style.bottom` | `vv.scroll` fires on every pan — corrupts value |
| `vv.resize` only + `bar.style.bottom` | Fires too late; intermediate frames missed |
| `vv.resize` only + transition suppression | Same timing issue; rAF made it worse |
| `dvh` / `svh` on body/html alone | Doesn't fix `position:fixed` anchor point |

---

## References

- CSS Overflow Module Level 3 — [§ overflow values](https://www.w3.org/TR/css-overflow-3/)
- Safari Bug #745729 — `overflow-x: clip` also clips Y-axis (Apple Developer Forums, 2024, unresolved through Safari 18.3)
- WebKit Bug #297779 — Fixed elements drift on scroll direction change (`rdar://159439271`, iOS 26+)
- Research session: Perplexity, ChatGPT, Claude, Gemini — March 2025
- Live fix commits in this repo: `1f63eb1` (RC1) → `46de068` (RC2/iOS)
