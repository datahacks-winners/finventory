# Design System Strategy: The Maritime Journal

## 1. Overview & Creative North Star
**Creative North Star: The Maritime Journal**
This design system moves away from the sterile, "software-as-a-service" aesthetic typical of B2B marketplaces. Instead, it adopts the persona of a high-end editorial publication. We are not just building a marketplace; we are curating the ocean’s bounty. 

The visual language breaks the rigid digital grid through **Intentional Asymmetry**. Large-scale typography, overlapping elements (images "breaking" out of containers), and significant white space create a sense of breathability and premium quality. Every screen should feel like a carefully composed spread in a modern food magazine—hopeful, mission-driven, and deeply connected to the coast.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the natural transitions of a coastal day, utilizing the provided Material Design tokens to create functional depth.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Traditional lines are "noise." Boundaries must be defined through:
1.  **Background Shifts:** Using `surface-container-low` sections against a `surface` background.
2.  **Tonal Transitions:** Defining edges through subtle shifts in hue rather than a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of heavy-stock paper.
*   **Base:** `surface` (#fff8f5) represents the broad "Sand" canvas.
*   **Sub-sections:** Use `surface-container-low` for large content areas.
*   **Prominence:** Use `surface-container-highest` for active or focused modules.
*   **Layering:** An inner container should always be at least one tier higher or lower than its parent to define its importance without a border.

### The "Glass & Gradient" Rule
To elevate the experience, use **Glassmorphism** for floating elements (like navigation bars or hovering price cards). Apply semi-transparent versions of `surface` with a 20px backdrop-blur. 
*   **Signature Textures:** Use gradients transitioning from `primary` (#005f93) to `primary_container` (#1e78b4) for CTAs. This creates a "liquid" depth that feels more sophisticated than flat fills.

---

## 3. Typography: The Editorial Voice
Our typography is the primary driver of the "Journal" feel. 

*   **Headings & Body (Poppins):** All Poppins instances must carry a **-0.02em letter-spacing**. This "tight" tracking mimics high-end print kerning, making the text feel authoritative and intentional.
*   **The Human Touch (Caveat):** Use Caveat (Script) sparingly for accent numbers, "From the Captain" notes, or decorative phrases. It provides a mission-driven, handwritten contrast to the geometric Poppins.

**Hierarchy Intent:**
*   **Display Scale:** Used for hero statements and mission-driven headers. It should feel massive and confident.
*   **Headline Scale:** Used for article titles and category headers. 
*   **Body Scale:** Focused on extreme readability. Ensure line-height is generous (1.6) to maintain the editorial feel.

---

## 4. Elevation & Depth
We convey hierarchy through **Tonal Layering** rather than structural scaffolding.

### The Layering Principle
Stack your surfaces. Place a `surface-container-lowest` card on a `surface-container-low` background to create a soft, natural lift. This mimics the way light hits paper.

### Ambient Shadows
Shadows must be "Ocean-Tinted." Never use pure black or grey. 
*   **Color:** Use a 6% opacity version of `primary` (#005f93) for shadows. 
*   **Execution:** Large blur values (20px to 40px) with low spreads. The shadow should feel like a soft glow, not a hard drop.

### The "Ghost Border" Fallback
If a border is strictly required for accessibility (e.g., input fields), use a **Ghost Border**: the `outline_variant` token at **15% opacity**. 100% opaque borders are strictly forbidden.

### Wavy SVG Dividers
To break the horizontal monotony, use organic, wavy SVG dividers between major sections. These should be subtle transitions between two surface tones (e.g., `surface` to `surface_container_low`) to mimic the tide line.

---

## 5. Components

### Buttons
*   **Primary:** Fully pill-shaped (`rounded-full`). Gradient fill from `primary` to `primary_container`. White text.
*   **Secondary:** Fully pill-shaped. `secondary_container` fill with `on_secondary_container` text.
*   **Interaction:** On hover, apply a subtle scale-up (1.02) and deepen the ambient ocean shadow.

### Cards & Lists
*   **Rule:** No divider lines. Separate items using `md` (1.5rem) or `lg` (2rem) vertical spacing.
*   **Visuals:** 14px border radius on all cards. Use `surface_container_lowest` for the card body to make it "pop" off the sand-colored background.

### Input Fields
*   **Style:** Minimalist. No background fill—only a bottom "Ghost Border" (15% opacity `outline_variant`). 
*   **Focus:** On focus, the bottom border transitions to a 2px `primary` line with a soft ocean glow.

### Editorial Accents (The "Feature" Component)
A custom component for this system: An asymmetrical block containing a large `display-md` headline, a small `Caveat` script annotation, and an image that overlaps the container's 14px rounded edge.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the "Sand":** Use the `surface` color (#fff8f5) as your primary negative space. It feels warmer and more premium than pure white.
*   **Mix the Fonts:** Place a small Caveat script label above a large Poppins headline. This is the hallmark of the coastal editorial look.
*   **Use Wide Margins:** Treat the screen like a magazine page. Give your content massive gutters to breathe.

### Don't:
*   **Don't use 1px solid grey lines.** Ever. They break the organic feel of the coast.
*   **Don't use standard shadows.** If the shadow doesn't have a hint of "Ocean Blue," it doesn't belong in this system.
*   **Don't crowd the UI.** If a screen feels "busy," increase the spacing and remove a container background. Let the typography do the work.
*   **Don't use square corners.** Everything must adhere to the 14px or Pill-shaped (`full`) rounding to maintain a soft, weathered-by-the-sea aesthetic.