# PennyPress Design System & UI Guide

## 1. Color Palette (Tailwind / CSS Variables)
PennyPress uses a sleek, modern color palette primarily relying on `zinc` (or `slate`) for a professional, tech-focused look.

- **Background**: `hsl(var(--background))` — Pure white (Light) / `zinc-950` (Dark)
- **Foreground**: `hsl(var(--foreground))` — `zinc-950` (Light) / `zinc-50` (Dark)
- **Primary**: `hsl(var(--primary))` — `zinc-900` (Light) / `zinc-50` (Dark) (Brand accent)
- **Muted**: `hsl(var(--muted))` — `zinc-100` (Light) / `zinc-800` (Dark) (For secondary backgrounds)
- **Destructive**: `hsl(var(--destructive))` — Red shades for danger actions (e.g. Delete, Stop)
- **Success/Active**: Green shades (e.g. `bg-green-500`) used explicitly for active worker statuses or completed payments.

## 2. Typography
- **Font**: Inter (Google Fonts)
- **Headings**:
  - `h1`: `text-3xl font-bold tracking-tight`
  - `h2`: `text-2xl font-semibold`
  - `h3`: `text-lg font-medium`
- **Body**: `text-base` for primary text, `text-sm text-muted-foreground` for descriptions and secondary info.

## 3. Layout Structure
### User Portal (`/`)
- **Header**: `h-16`, sticky top, contains Logo and User Avatar/Settings link.
- **Sidebar**: `w-64`, fixed left, contains navigation links (Dashboard, Features, My Features, Billing, Settings).
- **Main Content**: `max-w-7xl mx-auto px-6 py-8`
- **Minimum Width**: `1024px` (Responsive design for mobile is excluded in Phase 1).

### Admin Portal (`/admin`)
- **Header**: Dark themed (`bg-slate-900 text-white`) to distinctively separate it from the User Portal.
- **Sidebar**: Light gray (`bg-slate-50`) with active states highlighted in dark slate.

## 4. UI Components (Shadcn UI)
- **Card**: Used extensively for wrapping statistics, feature details, and form groups.
- **Button**: 
  - `default`: Primary actions (e.g., Save, Submit).
  - `outline`: Secondary actions (e.g., Cancel, Logout, Sync).
  - `ghost` / `icon`: For table row actions (Edit, Delete).
- **Badge**: Used for categorizing features (`secondary`), statuses (`default` for active, `destructive` for error/expired), and tags (`outline`).
- **Table**: Used in Admin pages (Users, Agents, Payments) to display tabular data cleanly.
- **Dialog (Modal)**: Used for Feature Details before subscribing, keeping the user in context.
- **Avatar**: Used in Header for user profile indication.

## 5. Interaction Patterns
- **Hover Effects**: Cards have `hover:border-primary transition-colors` to indicate clickability.
- **Empty States**: Centered `text-muted-foreground` text (e.g., "조건에 맞는 기능이 없습니다.") with generous padding (`py-20`).
- **Phase 1 Stubs**: Buttons for features not yet implemented (Social Login, Subscription, Edit/Delete, Sync) trigger a simple `alert()` explaining the phase.
