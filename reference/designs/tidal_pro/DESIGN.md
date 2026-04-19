# Design System Strategy: The Maritime Ledger

## 1. Overview & Creative North Star
The seafood industry is one of grit, precision, and volatile timing. To design for this B2B marketplace, we must move beyond the "app" look and move toward **"The Maritime Ledger."** 

This Creative North Star combines the authoritative weight of high-end editorial journalism with the high-tech precision of a sonar navigation system. We are rejecting the generic, flat "SaaS" aesthetic in favor of a layered, depth-heavy interface that feels as deep as the ocean itself. This system utilizes intentional asymmetry—overlapping cards and offset typography—to break the rigid grid, ensuring the platform feels bespoke and premium, not like a white-labeled template.

## 2. Colors: Depth and Immersion
Our palette is anchored in the deep `primary` (#003461) to evoke trust and the vastness of the sea, balanced by `secondary` seafoam greens (#006a65) for freshness and action.

*   **The "No-Line" Rule:** To achieve a high-end feel, **1px solid borders are strictly prohibited for sectioning.** We define boundaries through background color shifts. For example, a card using `surface_container_lowest` (#ffffff) should sit on a section of `surface_container_low` (#f2f4f6). This creates a "soft edge" that feels more sophisticated than a hard stroke.
*   **Surface Hierarchy & Nesting:** Treat the UI as a physical stack of materials.
    *   **Base Layer:** `surface` (#f7f9fb).
    *   **Navigation/Sidebars:** `surface_container` (#eceef0).
    *   **Interactive Cards:** `surface_container_lowest` (#ffffff) to provide maximum "pop."
*   **The "Glass & Gradient" Rule:** Main CTAs or hero sections must utilize a subtle linear gradient from `primary` (#003461) to `primary_container` (#004b87). For map overlays or floating search bars, use Glassmorphism: a semi-transparent `surface_container_low` with a 12px-20px backdrop-blur. This keeps the user connected to the data underneath.
*   **Signature Textures:** For data-rich visualizations, use the `secondary_fixed` (#79f6ed) to highlight "Freshness" metrics, creating a glowing, biological contrast against the deep blues.

## 3. Typography: Editorial Authority
We use a dual-font approach to balance prestige with "busy kitchen" legibility.

*   **The Display Scale (Work Sans):** Used for headlines and freshness grades. The wide apertures of Work Sans ensure that even at `display-lg` (3.5rem), the type feels modern and unshakeable. Use `on_surface` (#191c1e) for maximum contrast against light backgrounds.
*   **The Body Scale (Inter):** Used for logistics, weight data, and industrial forms. Inter is chosen for its mathematical precision. 
*   **Hierarchy for Efficiency:** In kitchen environments, use `title-lg` (1.375rem) for product names and `label-md` (0.75rem) in all-caps for "Time Since Catch" metadata. High-contrast typography is not just a style choice; it is a safety requirement.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often messy. In this system, we use **Tonal Layering.**

*   **The Layering Principle:** Instead of shadows, stack your containers. A `surface_container_highest` (#e0e3e5) drawer sliding over a `surface` (#f7f9fb) base provides clear hierarchy through value alone.
*   **Ambient Shadows:** If a card must "float" (e.g., a map pin detail), use a shadow with a 24px blur, 0px offset, and 6% opacity, tinted with the `primary` (#003461) color. This mimics natural light refracting through water.
*   **The "Ghost Border":** If a boundary is required for accessibility, use the `outline_variant` (#c2c6d1) at **15% opacity**. It should be felt, not seen.

## 5. Components: Industrial-Strength Precision

### Cards & Discovery
*   **Freshness Cards:** Forbid divider lines. Separate "Price per lb" from "Origin" using `body-sm` typography and a vertical spacing of 1.5rem. 
*   **Freshness Badges:** 
    *   **Sushi Grade:** `primary` background with `on_primary` text. 
    *   **Grade A:** `secondary_container` (#76f3ea) with `on_secondary_container` (#006f69). 
    *   **Grade B/C:** Desaturated `surface_variant` (#e0e3e5).
*   **Map Tools:** Use `primary_fixed` (#d3e4ff) for active route lines. Overlays must use the Glassmorphism rule to ensure the map remains the hero.

### Industrial Form Elements
*   **Input Fields:** Use `surface_container_high` (#e6e8ea) as the fill color with a `sm` (0.125rem) radius. This "heavy" feel conveys durability. The active state should use a 2px `primary` (#003461) bottom-border only—no full-box focus rings.
*   **Buttons:** 
    *   **Primary:** Solid `primary` (#003461). No rounded corners (use `none` or `sm` scale) to maintain an architectural, B2B feel.
    *   **Secondary:** Ghost style with `primary` text. No border, just a subtle `surface_container_highest` hover state.

### Data Visualizations
*   **The "Vitals" Chart:** Use `secondary` (#006a65) for temperature and oxygen data lines. Use `tertiary` (#611a00) for "Warning" thresholds. The contrast between seafoam and burnt orange is a signature visual of this system.

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts where text overlaps image containers slightly to create a high-end, editorial look.
*   **Do** prioritize vertical whitespace over lines. If in doubt, add another 8px of breathing room.
*   **Do** use `on_surface_variant` (#424750) for secondary metadata to ensure the primary information remains the focal point.

### Don't:
*   **Don't** use 100% black. Always use `on_surface` (#191c1e) to keep the palette sophisticated.
*   **Don't** use `DEFAULT` or `lg` roundedness for primary action buttons; keep them `sm` or `none` to maintain an "industrial/professional" edge.
*   **Don't** use standard tooltips. Create custom, high-contrast `inverse_surface` (#2d3133) popovers that feel like part of the navigation.

---
*Document Version: 1.0.0 | Confirmed for Junior Design Implementation.*