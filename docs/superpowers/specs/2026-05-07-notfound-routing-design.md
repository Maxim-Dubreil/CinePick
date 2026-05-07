# NotFound Page & Routing Design

**Date:** 2026-05-07  
**Scope:** Add React Router to frontend with structured routing and 404 page

## Overview

Implement a routing system for CinePick frontend using React Router v6. This enables navigation between pre-auth (Landing) and post-auth (Home with sub-routes) pages, plus a 404 page for undefined routes.

## Page Structure

### Pre-Auth
- `/` → Landing (Google OAuth, feature intro)

### Post-Auth  
- `/home` → Home (main authenticated view)
- `/home/profile` → User profile/Letterboxd sync
- `/home/question` → Question flow
- `/home/résultat` → Results/recommendations
- `*` → NotFound (catch-all for undefined routes)

## NotFound Component

**Location:** `src/pages/NotFound.tsx`

**Content:**
- Centered H1 title "Not Found" (italic)
- Cinema-themed emoji (🎬 or 🎞️)
- Short error message (French): "Désolé, cette page n'existe pas"
- Button "Retourner à l'accueil" linking to `/`

**Styling:**
- Light theme: Use `AppBackground` variant `light` (inherits from Landing)
- Dark theme: Use existing CSS variables (`bg-*` tokens)
- Center all content vertically and horizontally
- Responsive layout

## Routing Architecture

**Root Component:** `App.tsx` will be wrapped with `BrowserRouter` in `main.tsx`

**Route Structure:**
```
BrowserRouter
  └── App
      ├── AppLoader (existing)
      ├── ThemeToggle (existing)
      └── Routes
          ├── Route path="/" element={<Landing />}
          ├── Route path="/home/*" element={<Home />}
          │   └── Routes (nested)
          │       ├── Route path="profile" element={<Profile />}
          │       ├── Route path="question" element={<Question />}
          │       └── Route path="résultat" element={<Résultat />}
          └── Route path="*" element={<NotFound />}
```

## Implementation Details

**App.tsx Changes:**
- No change to component logic; routing wraps at entry point

**main.tsx Changes:**
- Import `BrowserRouter` from react-router-dom
- Wrap `<App />` with `<BrowserRouter>`

**New Files:**
- `src/pages/NotFound.tsx` — 404 page component
- `src/pages/Home.tsx` — authenticated home layout (orchestrates sub-routes)
- `src/pages/Profile.tsx` — profile page (stub for now)
- `src/pages/Question.tsx` — question flow page (stub for now)
- `src/pages/Résultat.tsx` — results page (stub for now)

**Styling:**
- NotFound uses Tailwind classes consistent with existing components
- Theme toggle controls dark/light via existing CSS variable system

## Success Criteria

- [ ] React Router installed and configured
- [ ] Landing page displays at `/`
- [ ] NotFound page displays for undefined routes (e.g., `/invalid`, `/home/unknown`)
- [ ] NotFound page looks good in light and dark themes
- [ ] Button "Retourner à l'accueil" navigates to `/`
- [ ] No ESLint warnings
- [ ] Build succeeds

## Notes

- Home and nested pages are stubs for now; full implementation follows in separate spec
- ThemeToggle remains accessible across all pages
- AppLoader continues to work as before
