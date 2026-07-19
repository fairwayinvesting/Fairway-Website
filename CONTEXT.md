# Fairway Investing — Full System Context

This document gives complete context on the Fairway Investing client and admin portal system. Use it alongside screenshots when reporting UI/UX issues for fixing.

---

## What this system is

A private client portal for **Fairway Investing** — a buyer's agency run by **Luke Clifford** (luke@fairwayinvesting.com.au, 0416 184 333, Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065).

Luke uses an **admin portal** to manage clients. Clients use a **client portal** to access their onboarding materials, market research reports, buying brief, and property presentations.

The site is hosted on **Netlify** at `fairwayinvesting.com.au`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Hosting | Netlify (static site + serverless functions) |
| Backend functions | Netlify Functions v2 — Node.js, `export default async (req)` pattern |
| Edge functions | Netlify Edge Functions (Deno) — used for access control on `/reports/*` |
| Data storage | Netlify Blobs — key/value JSON store, no traditional database |
| Auth | JWT (HS256) stored in HttpOnly cookies (`fw_session` for clients, `fw_admin` for admin) |
| Email | Resend API (`info@fairwayinvesting.com.au` sender, reply-to `luke@fairwayinvesting.com.au`) |
| Fonts | Google Fonts — Fraunces (serif headings) + Outfit (body) |
| Colour palette | Dark backgrounds (#1a1916, #22201d), rust/terracotta accent (#bd7a70 / #B5715A), cream text (#f7f3ed / #FAF6F1) |

---

## Data stores (Netlify Blobs)

All persistent data lives in these Blobs stores:

| Store name | What's in it | Key structure |
|---|---|---|
| `fairway-clients` | All client accounts | Single `all` key → array of client objects |
| `fairway-questionnaires` | Client onboarding questionnaire submissions | Keyed by `email-slug` |
| `fairway-briefs` | Buying briefs Luke builds per client | Keyed by `clientId` |
| `fairway-presentations` | Property presentations Luke creates | Single `all` key → array of presentation objects |
| `fairway-audit-log` | Activity log of all admin actions | Single `entries` key → array (max 200, newest first) |
| `fairway-ratelimits` | Login rate-limiting state | Keyed by `client-rl:{email}` |

### Client object shape
```json
{
  "id": "uuid",
  "name": "Full Name",
  "email": "email@example.com",
  "passwordHash": "hex",
  "passwordSalt": "hex",
  "markets": ["geelong", "bendigo"],
  "active": true,
  "createdAt": "ISO date",
  "setupToken": "hex (for first-time password setup)",
  "setupTokenExpiry": "ISO date"
}
```

### Presentation object shape
```json
{
  "id": "uuid",
  "address": "14 Smith Street",
  "suburb": "Geelong West VIC",
  "price": "$485,000",
  "propertyType": "house",
  "bedrooms": "3", "bathrooms": "1", "carspaces": "1", "landSize": "612m²",
  "summary": "Luke's assessment text",
  "highlights": ["Point 1", "Point 2"],
  "images": [{ "url": "...", "caption": "..." }],
  "videos": [{ "url": "...", "title": "..." }],
  "cashflow": { "enabled": true, "purchasePrice": "485000", "weeklyRent": "450", "interestRate": "6.5", "lvr": "80", ... },
  "riskProfile": { "enabled": false, "bushfireImageUrl": "", "floodImageUrl": "", "notes": "" },
  "demographics": { "enabled": false, "ownerOccupier": "65", "renter": "30", "publicHousing": "5", "notes": "" },
  "comparableSales": { "enabled": true, "items": [...] },
  "comparableRentals": { "enabled": false, "items": [] },
  "customSections": [{ "title": "...", "blocks": [{ "type": "text|image|video", "content": "..." }] }],
  "status": "available | offer | sold | (empty)",
  "expiresAt": null,
  "assignedClients": ["clientId1"],
  "revokedClients": [],
  "tokens": { "clientId1": "40-char hex token" },
  "views": { "clientId1": { "firstViewedAt": "ISO date", "viewCount": 2 } },
  "sentClients": ["clientId1"],
  "createdAt": "ISO date"
}
```

---

## Authentication

### Client auth
- Login at `/clients/` (index.html) → POST `/api/login`
- Server verifies password (PBKDF2/SHA-256, 100k iterations), issues a signed JWT in an HttpOnly cookie (`fw_session`)
- JWT payload: `{ sub: clientId, name, email, markets, exp }`
- JWT is used **only for identity** — all live data (markets, active status) is looked up fresh from Blobs on every request
- Session lasts 30 days
- First-time setup: client receives a setup link → `/clients/setup.html?token={hex}` → sets their own password

### Admin auth
- Admin enters a password on the admin portal
- Stored in `sessionStorage` as `fw_admin_pw`
- Sent as `Authorization: Bearer {password}` header on every API call
- Server compares against `ADMIN_PASSWORD` environment variable
- No JWT for admin — stateless bearer token per request

### Reports access control (Edge Function)
- `/reports/*` pages are guarded by a Deno edge function (`reports-guard.js`)
- Verifies `fw_session` JWT, then does a **live Blobs lookup** to check the client has access to that specific market
- If access denied → redirects to `/clients/portal.html`
- Admin cookie (`fw_admin`) bypasses this check

---

## All pages

### Client-facing pages

| Page | URL | Purpose |
|---|---|---|
| Login | `/clients/` | Email + password login form |
| Setup password | `/clients/setup.html` | First-time password creation via setup link |
| Client portal | `/clients/portal.html` | Main dashboard — shows questionnaire, brief, presentations, reports |
| Questionnaire | `/clients/questionnaire.html` | Multi-step onboarding form |
| Buying brief | `/clients/brief.html` | Shows the published buying brief Luke built for them |
| Property presentation | `/p/property.html?t={token}` | Full property presentation (token-gated, no login required) |
| Area reports | `/reports/{market}.html` | Market research report (login + market access required) |

All client pages are `noindex, nofollow`.

### Admin pages

| Page | URL | Purpose |
|---|---|---|
| Admin portal | `/admin/index.html` | Full admin dashboard |

---

## Client portal — how it works

URL: `/clients/portal.html`

On load, the portal calls four APIs in parallel:
1. `GET /api/me` — gets the logged-in client's name, email, markets
2. `GET /api/submit-questionnaire` — checks if questionnaire is completed
3. `GET /api/brief` — checks if a buying brief has been published for this client
4. `GET /api/presentations` — gets presentations assigned to this client (non-revoked only)

The portal then renders four sections from top to bottom:

### Section 1 — Questionnaire
- **Not completed**: Shows a prominent action card "Complete your questionnaire" with a call-to-action button
- **Completed**: Shows a subdued "Questionnaire complete" card with an "Edit answers" link

### Section 2 — Buying brief
- **Questionnaire not done**: Shows a locked/greyed-out state ("Complete your questionnaire first")
- **Questionnaire done, brief not published**: Shows "Being prepared" placeholder
- **Brief published**: Shows "View your buying brief →" card linking to `/clients/brief.html`

### Section 3 — Property presentations
- **Hidden** if no presentations assigned
- **Visible** with a grid of cards when presentations are assigned
- Each card shows: property type badge, address (large serif), suburb + price, "View presentation →" button
- Card links to `/p/property.html?t={client's unique token}`
- Status badge shown if property is "Under Offer" or "Sold"

### Section 4 — Area research
- **Hidden** if no markets assigned
- **Visible** with a grid of report cards (3-column desktop, 2-column tablet, 1-column mobile)
- Each card shows the market name and state, links to `/reports/{market}.html`

Available markets: Geelong (VIC), Bendigo (VIC), Dubbo (NSW), Bacchus Marsh (VIC), Devonport (TAS), Hobart (TAS), Lara (VIC), Launceston (TAS), Mackay (QLD), Melbourne (VIC), Newcastle (NSW), Rockhampton (QLD), Townsville (QLD)

---

## Buying brief page — how it works

URL: `/clients/brief.html`

Reads the published brief from `GET /api/brief`. The brief contains:
- **Strategy statement** (free text Luke writes)
- **Target markets** — shown as chips (known markets show state label, custom markets shown plainly)
- **Property types** — chips (e.g. House, Townhouse)
- **Property criteria** — green tick checklist (preset checkboxes + any custom ones Luke adds)
- **Excluded characteristics** — red X checklist (preset + custom)
- **Parameters meta-grid**: Entity, Purchaser(s), Purchase range (e.g. "$550k – $800k"), Timeline, Funding
- Entity/timeline/funding are auto-pulled from the client's questionnaire submission

---

## Property presentation page — how it works

URL: `/p/property.html?t={token}`

- No login required — access is controlled by the unique token in the URL
- Token is generated when Luke assigns a client to a presentation
- Calls `GET /api/property-view?t={token}` to fetch the presentation data
- Calls `POST /api/property-view?t={token}` (fire-and-forget) to record the view (sets `firstViewedAt`, increments `viewCount`)
- Shows: status badge, hero section (address, price, stats), photos, videos, Luke's assessment, highlights, comparable sales, comparable rentals, cashflow analysis, risk profile, demographics, custom sections
- Footer: "Email Luke" + "Call 0416 184 333" CTAs
- If token is invalid → "This presentation link is invalid"
- If access revoked → "Your access to this presentation has been removed" + reason

---

## Admin portal — how it works

URL: `/admin/index.html`

Password-gated. Four main sections:

### 1. Clients table
Columns: Name/email | Markets | Status | Created | Actions

Actions per client:
- **Brief** → opens the brief builder modal
- **Edit** → opens the edit modal (change name, email, markets, active status, password)
- **Dates** → toggles an inline milestones panel for that client
- **✉ Notify** → sends the "your market reports are ready" email (only shows if markets are assigned)
- **✕** → deletes the client

### 2. Brief builder modal
Opened by clicking "Brief" on a client row.

Tabs: Info (read-only questionnaire data) | Strategy | Criteria | Budget | Clients/Markets

Key fields:
- Strategy notes (free text, has a default placeholder)
- Property criteria (14 checkboxes + custom chips)
- Excluded characteristics (14 checkboxes + custom chips)  
- Budget min/max
- Target markets (known market checkboxes + custom market chips)
- Property types (checkboxes)
- Status: draft or published

Footer buttons:
- Cancel
- Save draft
- Publish — makes it visible to client
- ✉ Notify client — sends the brief notification email (only shows after publishing)

### 3. Property presentations table
Columns: Property | Client | Actions

Client column shows per-client status with colour indicators:
- 🟢 Green dot = client has viewed the presentation (shows date + view count)
- 🟠 Amber dot = client was notified but hasn't opened it yet
- ⚫ Grey dot = client assigned but not yet notified

Actions per presentation:
- **Edit** → opens the presentation builder modal (full details, media, analysis, sections, clients)
- **Preview** → opens a preview in a new tab (admin-only, no token needed)
- **✉ Notify** → sends the property presentation email to all assigned non-revoked clients
- **✉ Re-notify** → same button, label changes after first send
- **Delete** → removes the presentation

### Presentation builder modal
Tabs: Details | Media | Analysis | Sections | Clients

**Details**: Address, suburb, price, type (house/unit/etc), beds/baths/cars/land, Luke's assessment, key highlights

**Media**: Up to 3+ images (URL + caption), videos (YouTube/Vimeo/Streamable/direct MP4)

**Analysis** (collapsible panels):
- Cashflow analysis (purchase price, weekly rent, interest rate, LVR, management fee, rates, insurance, maintenance)
- Risk profile (bushfire image URL, flood image URL, notes)
- Demographics (owner-occupier %, renter %, public housing %, notes, image)
- Comparable sales (address, price, date, bed/bath/car/land, notes — multiple entries)
- Comparable rentals (address, weekly rent, date, bed/bath/car, notes — multiple entries)

**Sections**: Custom freeform sections with text/image/video blocks

**Clients tab**:
- Checkboxes for all active clients
- Per-assigned-client links with copy-link, resend, revoke/restore buttons
- Property status (Available / Under Offer / Sold)
- Expiry date

Footer: Cancel | Preview | **Save & Notify** (saves client assignment + immediately sends email) | Save changes

### 4. Activity log
Shows the last 200 audit events. Tracked events:
- `client_created` — new client added
- `client_updated` — client name changed
- `client_status_changed` — activated or deactivated
- `client_password_reset` — password reset by admin
- `markets_assigned` — markets updated for a client
- `markets_notified` — "reports ready" email sent
- `brief_draft_saved` — brief saved as draft
- `brief_published` — brief published to client
- `brief_notified` — brief notification email sent
- `presentation_created` — new presentation created
- `presentation_sent` — presentation email sent to client(s)
- `access_revoked` — client access to a presentation revoked
- `presentation_deleted` — presentation deleted

---

## Notification emails — full flow

There are four notification touchpoints in the client journey. All emails are sent via Resend from `Luke at Fairway <info@fairwayinvesting.com.au>` with reply-to `luke@fairwayinvesting.com.au`.

### 1. Welcome email (automatic)
**Trigger**: Admin creates a new client account  
**What it contains**: Welcome message, portal URL, their email address, "Set your password →" button (links to `/clients/setup.html?token={setupToken}`)  
**Setup link expires**: 7 days

### 2. Market reports ready
**Trigger**: Admin clicks "✉ Notify" on a client row (only available if markets are assigned)  
**What it contains**: "Your reports are ready, [First name]" heading, "View your reports →" button linking to `/clients/portal.html`

### 3. Buying brief ready
**Trigger**: Admin clicks "✉ Notify client" inside the brief modal (only appears after brief is published)  
**What it contains**: Brief notification with a "View your brief →" button linking to `/clients/brief.html`

### 4. Property presentation
**Trigger**: Admin clicks "✉ Notify" or "✉ Re-notify" from the presentations table, OR clicks "Save & Notify" inside the presentation modal  
**What it contains**: "I've found one I want you to see" heading, property card (address, type, beds/baths/cars, price), "View full presentation →" button linking to `/p/property.html?t={client's unique token}`  
**Note**: Each client has their own unique token — the link in the email is personalised and tracks views

---

## How the pieces connect

```
Admin creates client
    → Welcome email sent automatically
    
Client sets password via setup link
    → Can now log in to portal
    
Client completes questionnaire
    → Stored in fairway-questionnaires (keyed by email)
    → Admin can see completed status in brief modal
    
Admin builds buying brief
    → Saved to fairway-briefs (keyed by clientId)
    → Status: draft → published
    → Admin clicks Notify → brief email sent
    
Admin assigns market reports
    → Updates client.markets array in fairway-clients
    → Admin clicks Notify → reports email sent
    → Edge function (reports-guard.js) gates /reports/* pages
      using a live Blobs lookup (not the JWT, to avoid stale data)
    
Admin creates property presentation
    → Saved to fairway-presentations (all key → array)
    → Assigns client → token generated automatically
    → Admin clicks Save & Notify (or Notify from table)
      → email sent with personalised link
    → Client clicks link in email → /p/property.html?t={token}
      → view tracked (firstViewedAt, viewCount)
    → Presentation also shows in client portal 
      via GET /api/presentations (JWT-gated, returns client's assigned presentations)
```

---

## API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/login` | None | Client login, issues JWT cookie |
| POST | `/api/logout` | Cookie | Clears JWT cookie |
| GET | `/api/me` | Cookie | Returns current client's live data |
| GET/POST | `/api/submit-questionnaire` | Cookie | Get or submit questionnaire |
| GET | `/api/brief` | Cookie | Get published brief for this client |
| GET | `/api/presentations` | Cookie | Get presentations assigned to this client |
| GET/POST | `/api/property-view` | Token param | Get presentation data / record view |
| POST | `/api/setup-password` | Setup token | Set password for first time |
| GET/POST/PUT/DELETE | `/api/admin/clients` | Bearer | Manage clients |
| GET/POST | `/api/admin/brief` | Bearer | Get/save/publish/notify brief |
| GET/POST/PUT/DELETE | `/api/admin/presentations` | Bearer | Manage presentations |
| GET | `/api/admin/audit-log` | Bearer | Get activity log |
| GET/POST | `/api/admin/milestones` | Bearer | Get/manage client milestones |

---

## Design system

**Colours**
- Background: `#1a1916` (page) / `#22201d` (cards, nav)
- Accent: `#bd7a70` (client portal) / `#B5715A` (email templates)
- Text: `#f7f3ed` (primary) / `rgba(247,243,237,0.45)` (secondary)
- Success: `#6dbf7b` (green)
- Warning: `#e8a87c` (amber)
- Error: `#f08080` (red/pink)

**Typography**
- Headings: Fraunces (optical-size serif, weight 400)
- Body: Outfit (geometric sans, weight 300–600)

**Components (client portal)**
- `.action-card` — horizontal card with icon, title, sub-text and button (used for questionnaire + brief)
- `.card` — vertical grid card with state label, name, button (used for reports + presentations)
- `.section-label` — small uppercase label above a grid section

**Components (admin portal)**
- `.btn-primary` — rust/terracotta filled button
- `.btn-secondary` — ghost button
- `.btn-sm .btn-edit` — small grey action button
- `.btn-sm .btn-notify` — small green action button
- `.btn-sm .btn-delete` — small red action button
- `.pill` — rust-tinted tag chip
- `.pill-inactive` — grey tag chip
- `.modal` — centred overlay modal (clients, brief)
- `.pres-modal` — larger tabbed modal (presentations)

---

## Known current state

- All four notification emails are working
- Brief builder, questionnaire, and reports are all fully functional
- Property presentations: admin table redesigned with per-client status, "Save & Notify" button in modal saves assignment before sending (fixes previous "sent to 0 clients" bug)
- Client portal shows all four sections correctly
- JWT staleness fix is in place: `/api/me` and the reports edge function do live Blobs lookups, not JWT reads, for markets/active status
- All pages are noindex/nofollow and not publicly discoverable
