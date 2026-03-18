# HoneyDoIQ Frontend Redesign — Design Spec

## Direction

**Aesthetic:** Clean Modern — premium iOS-like feel, bold sans-serif, white space, pill shapes, cheerful
**Typography:** Plus Jakarta Sans (all weights 400–800)
**Icons:** Lucide React (tree-shakeable, 1.5px stroke)
**Neutrals:** Warm stone palette (#fafaf9, #f5f5f4, #e7e5e4, #a8a29e, #78716c, #57534e, #44403c, #292524, #1c1917)
**Brand:** Amber/honey (#f59e0b primary, gradient from #fbbf24 → #f59e0b)

## Design System Changes

### Typography

Replace Geist Sans with Plus Jakarta Sans via `next/font/google`.

```
Headings: Plus Jakarta Sans 800 (extra-bold), letter-spacing: -0.5px to -1px
Body: Plus Jakarta Sans 400–600
Monospace: Keep Geist Mono for code/data
```

### Color Tokens

Replace zinc neutrals with stone neutrals in `tokens.css`:

```
--color-neutral-50:  #fafaf9   (was #fafafa)
--color-neutral-100: #f5f5f4   (was #f4f4f5)
--color-neutral-200: #e7e5e4   (was #e4e4e7)
--color-neutral-300: #d6d3d1   (was #d4d4d8)
--color-neutral-400: #a8a29e   (was #a1a1aa)
--color-neutral-500: #78716c   (was #71717a)
--color-neutral-600: #57534e   (was #52525b)
--color-neutral-700: #44403c   (was #3f3f46)
--color-neutral-800: #292524   (was #27272a)
--color-neutral-900: #1c1917   (was #18181b)
--color-neutral-950: #0c0a09   (was #09090b)
```

Update `globals.css` light/dark theme vars to match.

### Border Radius

Increase default radii for the softer, modern look:

```
Cards: rounded-2xl (16px) — was rounded-xl
Buttons: rounded-xl (14px) — was rounded-lg
Inputs: rounded-xl (14px) — was rounded-lg
Badges/pills: rounded-full (99px)
Icon boxes: rounded-xl (12px)
```

### Icons

Install `lucide-react`. Replace all inline SVGs across every component and page with Lucide icon components. Standard sizes:

```
Navigation: size={24}
Inline/buttons: size={16} or size={18}
Feature icons: size={20}
```

### Shadows

Keep current shadow tokens. Add a subtle card hover shadow:

```
--shadow-card-hover: 0 8px 25px -5px rgb(0 0 0 / 0.08);
```

## Page Designs

### Landing Page (`src/app/page.tsx`)

**Layout:** Full-screen amber gradient (top: #fffbeb → mid: #fef3c7 → bottom: #fbbf24)

**Top section (centered, 60% of screen):**
- App icon: 🏠 emoji on amber gradient square, 64px, rounded-2xl, drop shadow
- Headline: "Your honey-do list, but smarter." — 36px, extra-bold, color: #451a03
- Subtext: "Smart home maintenance tracking and reminders. Never forget when you last changed that filter." — 16px, color: #92400e
- Feature row: 4 icons in frosted glass boxes (Track 📋, Remind 🔔, Score 📊, Share 👨‍👩‍👧) with labels

**Bottom section (pinned):**
- "Continue with Google" button — white, shadow, full width, 52px height
- "Continue with Apple" button — dark (#1c1917), full width, 52px height
- Legal text: "Free to use · Your data stays private" — 11px, #92400e

### Dashboard (`src/app/(app)/dashboard/page.tsx`)

**Header:**
- Left: "Good morning" subtext + "Home Name 🏡" greeting (24px extra-bold)
- Right: User avatar circle (amber gradient, white initial, 40px)

**Health Score Card:**
- SVG circular progress ring (100px) with gradient stroke (amber → green)
- Score number centered in ring (28px extra-bold)
- Right side: category breakdown (Safety, Prevention, Efficiency) with colored percentages
- Positive message: "Looking good! 🎉" or contextual based on score

**Needs Attention Section:**
- Section title with red badge count
- Task rows: priority color bar (4px left strip) + circle checkbox + task name/meta + urgency badge
- Badge colors: red (Overdue), amber (Today), gray (Soon)

**This Week Card:**
- 3-column stat layout: Completed / Remaining / Spent
- Large numbers (28px bold) with small labels
- Divider lines between columns

### Tasks (`src/app/(app)/tasks/page.tsx`)

**Header:** "Tasks" title + black rounded add button (+ icon)

**Filter pills:** Horizontal scroll, pill-active (dark bg) / pill-inactive (muted bg). Counts in mini-badges.

**Task groups by urgency:**
- Group labels: uppercase, letter-spaced, colored (red: Overdue, amber: This week, gray: Upcoming)
- Task rows: priority strip + checkbox + name/meta + chevron
- Upcoming tasks at 60% opacity to create visual hierarchy

### Property (`src/app/(app)/home-profile/page.tsx`)

**Hero card:** Amber gradient background, oversized emoji watermark (80px, 15% opacity), home name/type/stats

**Systems:** Chip/tag layout with emoji + label, white bg, rounded-xl

**Members:** Card with avatar rows, gradient avatar backgrounds (unique color per member), role badges

**Documents:** Card rows with colored icon boxes, file name/meta

### Settings (`src/app/(app)/settings/page.tsx`)

**iOS-style grouped sections:**
- Section labels: uppercase, letter-spaced, gray, small
- White card groups with rows separated by subtle borders
- Toggle switches: amber when on, neutral when off
- Drill-down rows show value + "›" chevron
- Sections: Notifications, Account, Appearance, About
- Red "Sign out" button at bottom

### Onboarding (`src/app/onboarding/page.tsx`)

**Progress bar:** Horizontal dots/bars, filled (amber) for completed, light for current, gray for future

**Step content:**
- Title: 22px extra-bold
- Subtitle: 14px muted, explains why this step matters
- Selection cards: icon box + label + description, 2px border, selected state = amber border + amber bg tint

**CTA:** Full-width dark button "Continue →", step indicator below

### Bottom Navigation (`src/components/layout/bottom-nav.tsx`)

- Frosted glass effect: bg-white/85 + backdrop-blur-xl
- 4 items: Home (LayoutDashboard), Tasks (CheckSquare), Property (Home), Settings (Settings)
- Active: amber color + amber-50 background on icon
- Lucide icons, 24px
- Safe area padding for notched phones

### App Shell (`src/components/layout/app-shell.tsx`)

- Max width: max-w-lg (512px) centered
- Padding: px-5 pb-24 pt-4
- Background: --color-neutral-50 (#fafaf9)

## Component Updates

All existing UI components (Button, Card, Badge, Input, Dialog, etc.) keep their CVA structure. Changes:

- **Button:** Update border-radius to rounded-xl, update neutral colors to stone
- **Card:** Update to rounded-2xl, stone border color
- **Badge:** Add rounded-full as default, keep color variants
- **Input:** Update to rounded-xl, stone borders
- **Progress:** Keep existing, add circular progress ring component
- **New: ProgressRing** — SVG-based circular progress with gradient stroke

## Motion

- Page content: staggered fade-in on mount (opacity 0→1, translateY 8→0, 300ms, staggered 50ms)
- Task completion: scale to 95% + fade to 30% → remove with 200ms delay
- Bottom nav: active icon background scales in (0→1, 200ms spring)
- Cards: subtle hover shadow transition (200ms)
- Health score ring: animate stroke-dashoffset on mount (800ms ease-out)

## Files to Modify

1. `src/app/layout.tsx` — swap Geist for Plus Jakarta Sans
2. `src/styles/tokens.css` — update neutral palette to stone
3. `src/app/globals.css` — update theme vars
4. `src/app/page.tsx` — full landing page redesign
5. `src/app/(app)/dashboard/page.tsx` — full dashboard redesign
6. `src/app/(app)/tasks/page.tsx` — full tasks redesign
7. `src/app/(app)/home-profile/page.tsx` — full property redesign
8. `src/app/(app)/settings/page.tsx` — full settings redesign
9. `src/app/onboarding/page.tsx` — full onboarding redesign
10. `src/components/layout/bottom-nav.tsx` — Lucide icons, frosted glass
11. `src/components/layout/app-shell.tsx` — spacing updates
12. `src/components/ui/button.tsx` — radius + color updates
13. `src/components/ui/card.tsx` — radius + color updates
14. `src/components/ui/badge.tsx` — ensure rounded-full default
15. `src/components/ui/input.tsx` — radius + color updates
16. `src/components/ui/select.tsx` — radius + color updates
17. `src/components/ui/progress.tsx` — add ProgressRing component
18. `package.json` — add lucide-react dependency

## Not in Scope

- Dark mode visual refresh (keep current dark mode, update tokens only)
- New pages or routes
- API changes
- Backend logic
