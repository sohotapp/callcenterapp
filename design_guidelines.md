# Design Guidelines: Government Sales Pipeline Platform

## Design Approach

**Selected Approach:** Design System - Productivity Application Pattern

**Reference Framework:** Linear + Modern CRM (Salesforce, HubSpot) + Shadcn UI aesthetic
- Prioritizes information density and quick data access
- Clean, scannable layouts for high-volume contact management
- Professional productivity tool aesthetic with modern refinement

**Core Principles:**
1. Information hierarchy over decoration
2. Rapid cognitive processing of lead data
3. Streamlined workflow efficiency
4. Professional credibility for B2G sales context

---

## Typography System

**Font Families:**
- Primary: Inter (Google Fonts) - body text, UI elements, data tables
- Monospace: JetBrains Mono (Google Fonts) - phone numbers, IDs, technical data

**Hierarchy:**
- Page Headers: text-3xl, font-semibold
- Section Headers: text-xl, font-semibold  
- Card Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Supporting Text: text-sm
- Metadata/Labels: text-xs, font-medium, uppercase tracking

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-4, p-6
- Section spacing: gap-6, gap-8
- Card margins: m-4
- Grid gaps: gap-4

**Container Structure:**
- Main dashboard: Full viewport height with sidebar navigation
- Content area: max-w-7xl with p-6 or p-8 padding
- Data tables: Full-width within content container
- Detail panels: Slide-out drawers or modal overlays (max-w-2xl)

---

## Component Library

### Navigation
- **Sidebar:** Fixed left navigation (w-64), collapsible
  - Logo/branding at top
  - Primary nav items with icons (Lucide)
  - Active state: subtle background treatment
  - Bottom: user profile/settings

### Dashboard Components

**Lead Contact Cards:**
- Compact card design with critical data visible
- Layout: Institution name (large), Department (medium), Phone (prominent, monospace), Priority badge
- Action buttons: "View Script", "Mark Called", "Export"
- Hover state: Subtle elevation change

**Data Table (Contact Grid):**
- Sortable columns: Institution, Type, State, Phone, Priority Score, Status
- Row height: Compact for high-density viewing
- Sticky header on scroll
- Inline actions column: Quick-dial icon, script preview icon
- Zebra striping for readability

**Script Generator Panel:**
- Two-column layout for script view
- Left: Government context (pain points, budget, tech maturity)
- Right: Generated script with talking points as bullet list
- Copy-to-clipboard button for entire script
- Edit mode toggle

**Lead Enrichment View:**
- Tabbed interface: Overview, Pain Points, Decision Makers, Recent News
- Overview tab: Grid layout with stat cards (budget, population served, tech score)
- Pain points: Bullet list with severity indicators
- Decision makers: Contact cards with role, phone, email

### Forms & Inputs
- Search bars: Prominent with icon prefix, placeholder text
- Filters: Dropdown selects for State, Type, Priority, Status
- Quick actions: Floating action button for "Add Manual Lead"

### Status & Indicators
- Priority badges: Pill shape, varying sizes (High/Medium/Low)
- Lead score: Progress bar or circular gauge (0-100)
- Call status: Colored dot + label (Not Called, In Progress, Follow-up, Closed)

---

## Page Layouts

### Main Dashboard
- Sidebar navigation (left)
- Top bar: Search + filters + user menu
- Content: Statistics overview cards (4 across: Total Leads, High Priority, Calls Today, Close Rate)
- Below: Full-width contact data table

### Script Preparation View
- Split layout: 60/40
- Left: Full generated script with sections (Opening, Pain Point Match, Solution Pitch, Objection Handlers, Close)
- Right: Government quick reference (sticky card with key facts)

### Lead Detail Page
- Breadcrumb navigation
- Hero section: Institution name, location, contact info
- Content sections stacked vertically
- Right sidebar: Quick actions, call history timeline

---

## Images

**No hero images** - This is a data-focused productivity tool, not a marketing site.

**Icon Usage:**
- Font Awesome or Lucide Icons via CDN
- Navigation icons: 20px
- Card/action icons: 16px  
- Table icons: 14px

---

## Interaction Patterns

- Tables: Click row to open detail drawer
- Cards: Hover reveals secondary actions
- Scripts: One-click copy entire script or individual sections
- Filters: Multi-select dropdowns with apply/clear actions
- Export: Modal with format selection (CSV, Excel) and field customization

---

## Accessibility
- High contrast text ratios throughout
- Keyboard navigation for all interactive elements
- Focus states clearly visible
- ARIA labels on icon-only buttons
- Screen reader announcements for dynamic content updates