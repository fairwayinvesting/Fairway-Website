# Fairway Investing — Implementation Spec for Claude Code

This is a single, self-contained work order. Implement the ten changes below in the Fairway Investing codebase. Everything you need is here: the stack, the conventions, each change with desktop + mobile behaviour, the data-model changes, and per-item acceptance criteria. Work through the items in the order given at the end.

Read this whole document before starting. Then work item by item, committing after each so changes are reviewable.

---

## 0. Context you need

**What the app is.** A private client + admin portal for Fairway Investing (a buyer's agency). Luke (admin) manages clients and builds property presentations; clients log in to view onboarding, a buying brief, market reports, and property presentations. There is also a set of public partner referral pages.

**Stack.**
- Hosting: Netlify (static site + serverless functions).
- Backend: Netlify Functions v2 (Node.js, `export default async (req)`).
- Edge: Netlify Edge Functions (Deno) — `reports-guard.js` gates `/reports/*`.
- Storage: **Netlify Blobs** (key/value JSON, no SQL DB).
- Auth: client JWT (HS256) in HttpOnly cookie `fw_session`; admin bearer token (`ADMIN_PASSWORD`) in `Authorization` header.
- Email: Resend.
- Fonts: Fraunces (serif headings), Outfit (body).

**Blobs stores.**
- `fairway-clients` — key `all` → array of client objects.
- `fairway-questionnaires` — keyed by `email-slug`.
- `fairway-briefs` — keyed by `clientId`.
- `fairway-presentations` — key `all` → array of presentation objects.
- `fairway-audit-log` — key `entries` → array (max 200, newest first).
- `fairway-ratelimits` — keyed by `client-rl:{email}`.
- (Milestones/upcoming-dates are stored via `/api/admin/milestones` — locate the store it uses.)

**Relevant API endpoints.**
- `GET /api/me`, `GET /api/presentations` (client, cookie).
- `GET/POST /api/property-view?t={token}` (token-gated public presentation).
- `GET/POST/PUT/DELETE /api/admin/clients`, `/api/admin/presentations`, `/api/admin/brief`, `/api/admin/milestones` (bearer).

**Admin pages:** `/admin/index.html`. **Client pages:** `/clients/*`. **Public presentation:** `/p/property.html?t=…`. **Partner referral pages:** `/p/{slug}` (e.g. `/p/shiv-neel-i8wtg`), with an index listing all partners.

---

## 1. Global conventions — apply to every item

### Brand tokens (use these exact values; match existing CSS variables if present)
- Page background `#1a1916`; card/nav surface `#22201d`; selected/tinted surface `#2a231f`.
- Accent (rust) `#bd7a70` (client portal) / `#B5715A` (email templates).
- Text primary `#f7f3ed`; text secondary `rgba(247,243,237,0.45)`; hairline borders `rgba(247,243,237,0.10–0.14)`.
- Success (green) `#6dbf7b`; warning (amber) `#e8a87c`; error (red) `#f08080`.
- Headings: Fraunces. Body/UI: Outfit.
- Corners: 8px controls, 10–12px cards, pills fully rounded.

### Mobile parity — MANDATORY for every item
Every change must work on mobile as well as desktop. The reference mockups describe desktop; you are responsible for the responsive behaviour. For each item:
- Multi-column grids collapse to 1 (or 2) columns on narrow screens (≤ ~480px).
- Tap targets ≥ 40px; toggles/ticks ≥ 26px.
- Chips, market tags, and action clusters **wrap** instead of overflowing; never introduce horizontal scroll on a card.
- No hover-only affordances — anything shown on hover must also be reachable by tap.
- Labels must not truncate awkwardly; use `text-overflow: ellipsis` on emails, allow names to wrap.
- On mobile, per-row action icon clusters may become a full-width button row (icon + short label) as shown in the mobile mockups.
- Test each screen at ~360px and ~768px widths before considering the item done.

### General rules
- Don't break existing presentations/clients — where a schema changes, add a read-time migration (details per item).
- Keep all admin writes appending to `fairway-audit-log` where the existing code already does so.
- Sentence case for UI copy. No new dependencies unless necessary.

---

## 2. ITEM 1 — Fix Area demographics layout (Analysis tab)

**Problem.** In the presentation builder's Analysis tab, the "Owner occupier (%)" label wraps to two lines while the other two labels don't, so the three inputs misalign and the block looks broken.

**Change.**
- Lay the three fields out as a strict equal-width 3-column grid: `display:grid; grid-template-columns:repeat(3,1fr); gap:14px;`.
- Shorten labels to single-line and force no-wrap: "Owner-occupier %", "Renter %", "Public housing %", each `text-transform:uppercase; white-space:nowrap;` with a fixed line-height so all three baseline-align.
- Add a thin stacked proportion bar beneath the inputs showing owner / renter / public split (colours: owner `#bd7a70`, renter `#8a9a7b`, public `#e8a87c`), with a small legend. Normalise/clamp the three values so the bar never exceeds 100%.
- Keep the existing Notes field and demographics screenshot upload row below, unchanged.

**Data.** No schema change — reads existing `demographics.{ownerOccupier, renter, publicHousing}`.

**Mobile.** 3 columns → 2 columns (public housing wraps to its own row) or a single column if too tight; proportion bar full width; legend wraps.

**Acceptance.**
- All three labels render on one line and their inputs are equal width and top-aligned at desktop and mobile.
- Proportion bar reflects the entered values and never overflows.

---

## 3. ITEM 2 — Make Risk profile extensible (Analysis tab)

**Problem.** Risk profile only supports bushfire + flood. Luke needs to add any risk (overhead powerlines, busy main road, flight-path noise, easements, slope, proximity to commercial/industrial, etc.).

**Change.** Convert Risk profile from two fixed blocks into a list of toggleable risk items:
- Ship presets: Bushfire zone, Flood zone, Overhead powerlines, On a busy main road, Flight-path noise. Each is a full-width row with an icon, label, and an on/off toggle.
- Add an "Add a custom risk" button: user types a label, optionally picks an icon (default a generic warning/alert icon), and gets the same fields.
- When a risk is toggled **on**, it expands to reveal an optional screenshot (upload or paste URL) and a notes textarea. Off = collapsed and excluded from the client presentation.

**Data — schema change to the presentation object.** Replace the fixed `riskProfile` with:
```json
"riskProfile": {
  "enabled": true,
  "risks": [
    { "id": "bushfire",   "label": "Bushfire zone",        "icon": "flame",  "on": true,  "imageUrl": "", "notes": "" },
    { "id": "flood",      "label": "Flood zone",           "icon": "ripple", "on": true,  "imageUrl": "", "notes": "" },
    { "id": "powerlines", "label": "Overhead powerlines",  "icon": "bolt",   "on": false, "imageUrl": "", "notes": "" },
    { "id": "custom-<uid>","label": "On a busy main road", "icon": "road",   "on": false, "imageUrl": "", "notes": "" }
  ]
}
```

**Migration (required).** Add a helper used by BOTH `GET /api/admin/presentations` and `GET /api/property-view` (and the admin builder load): if a presentation still has the old shape `{ enabled, bushfireImageUrl, floodImageUrl, notes }`, map it to two `risks[]` entries (bushfire + flood) carrying over the image URLs and notes. Never mutate on read unless you also persist — do the mapping in-memory on read so old records render correctly; persist the new shape next time the presentation is saved.

**Client render.** On `/p/property.html`, render only `risks` where `on === true`, each as a titled block with its screenshot + notes. If none are on (or `enabled` is false), hide the whole Risk section.

**Mobile.** Risk rows are already full-width; expanded screenshot + notes stack vertically. "Add a custom risk" is a full-width dashed button.

**Acceptance.**
- Existing presentations with the old riskProfile still display bushfire/flood correctly (migration works).
- Luke can toggle presets, add a custom risk with label + icon + screenshot + notes, save, reload, and see it persisted.
- Client presentation shows only enabled risks and hides the section when none are on.

---

## 4. ITEM 3 — Redesign the client picker (Clients tab)

**Problem.** Clients are assigned with raw native checkboxes against upper-case names — looks unprofessional on desktop and mobile.

**Change.** Replace checkboxes with selectable client rows:
- Each row: avatar initials circle (stable brand colour per client), proper-case name, email sub-line, and a clear selected state — selected = rust border (`#bd7a70`) + filled rust tick circle on the right; unselected = hairline border + empty ring.
- Header line: "N selected · Select all".
- For already-assigned clients, show a small status pill derived from existing data: Viewed (`views[clientId]` present, with count) = green; Notified, not opened (`sentClients` includes id, no view) = amber; Assigned, not notified = neutral.
- Selecting/deselecting toggles the client in the assignment set (see Item 5 for what save does with the diff).

**Data.** No schema change; state is still the set of selected `clientId`s.

**Mobile.** Single-column full-width rows, row height ≥ 56px, tick target ≥ 40px, email truncates with ellipsis, status pill sits under the name.

**Acceptance.**
- No native checkboxes remain in the Clients tab.
- Selected/unselected states are visually obvious at both widths.
- Status pills reflect real view/notify state.

---

## 5. ITEM 4 — Presentation polish + builder discipline (client-facing + builder)

**Goal.** The client-facing presentation must look premium; the builder must allow lots of detail without clogging.

**Change.**
- **Everything-is-a-section model.** Ensure cashflow, risk, demographics, comparable sales, comparable rentals, and custom sections each follow one pattern in the builder: a labelled panel with an on/off toggle and a collapse. Disabled sections are excluded from the client view; collapsed sections keep the builder short.
- **Consistent toggle + add-custom interaction** across risks (Item 3/2), custom sections, and comparable items.
- **Curated client render order.** On `/p/property.html`, render enabled sections in a FIXED premium order regardless of builder order: hero (address, price, key stats) → photo gallery → videos → Luke's assessment → key highlights → comparable sales → comparable rentals → cashflow → risk → demographics → custom sections → contact footer ("Email Luke" + "Call 0416 184 333"). Never render empty section shells or headers with no content.
- Keep the existing Preview action prominent. If low-effort, add "Preview as [client]" that opens the preview using that client's tokened context and status banner.

**Data.** No new store. This is rendering discipline + the shared toggle component.

**Mobile.** Presentation is single-column; hero stats wrap to a 2-col grid; gallery becomes a swipe/stack; comfortable spacing and Fraunces headings preserved.

**Acceptance.**
- A presentation with several sections disabled renders on the client page with only the enabled ones, in the fixed order, with no empty blocks.
- Builder sections all share the same toggle/collapse pattern.

---

## 6. ITEM 5 — Admin ↔ client sync: show assigned names + make assign/revoke gate access

**Problem.** The presentations table shows "No client assigned" even after assigning; and there's no guarantee that unassigning a property or removing a market removes the client's access.

**Change.**
- **Show assigned client names.** In the presentations table Client column, render each assigned (non-revoked) client as a compact chip: status dot + name (+ view count if viewed). Multiple chips wrap. Show the dashed "No clients assigned" pill only when the non-revoked assigned list is empty. Status dot: green = viewed, amber = notified not opened, neutral = assigned not notified.
- **Names come from the live client record.** Resolve chip labels from `fairway-clients` by `clientId` at render time — never from anything cached on the presentation — so renamed clients are correct and deleted clients never ghost.
- **Assign = grant, unassign = revoke.** On saving the Clients tab, compute the diff vs `assignedClients`:
  - Newly selected → generate a 40-char hex token, add id to `assignedClients`, add `tokens[clientId]`.
  - Deselected → move id to `revokedClients` and invalidate/remove its token so `GET /api/property-view?t=…` returns the "access removed" state; the client's `GET /api/presentations` already filters out revoked, so the card disappears from their portal too.
  - Write token add/revoke atomically with the assignment change; append `presentation_sent` / `access_revoked` to `fairway-audit-log` as the existing code does.
- **Markets mirror this.** Removing a market from `client.markets` must immediately drop the matching card from the client portal's Area research section and cause `reports-guard.js` to deny `/reports/{market}`. The guard already does a live Blobs lookup; verify the portal reads markets live via `/api/me` (not a stale JWT copy) and that the admin market write updates `fairway-clients`.

**Data.** Uses existing `assignedClients`, `revokedClients`, `tokens`, `views`, `sentClients` fields. No shape change.

**Mobile.** Presentation rows become stacked cards; assigned-client chips wrap; actions become a full-width icon+label button row.

**Acceptance (verify all):**
- Assign a client → their name chip appears in the table AND the presentation card appears in that client's portal.
- Revoke a client → chip removed/greyed, their `/p/property.html?t=…` link shows "access removed", and the card is gone from their portal.
- Remove a market from a client → the report card disappears from their portal and `/reports/{market}` redirects to the portal.
- Rename a client → the chip in the presentations table shows the new name.

---

## 7. ITEM 6 — Collapse the 2FA / Security section (admin)

**Problem.** 2FA is already set up but the Security card sits open and prominent at the foot of the admin dashboard, wasting space.

**Change.**
- When 2FA is enabled, render a single quiet line: "Two-factor authentication: On · Manage", expanding only on click. Keep the full setup card only for the not-yet-enabled state.
- Preferred: move Security out of the main dashboard flow into a small settings/account menu behind a gear icon in the admin header; keep the same "Set up / view 2FA" action there.

**Data.** None — read the existing 2FA-enabled flag.

**Mobile.** Collapsed one-liner is full-width; gear menu is a standard mobile dropdown/sheet.

**Acceptance.**
- With 2FA on, the dashboard shows only the collapsed line (or a header gear entry), not the full card.
- The full setup flow still appears when 2FA is off.

---

## 8. ITEM 7 + ITEM 10 — Partner referral pages: fix Shiv's name + standardise role labels

Do these together — both touch the same partner records.

**Problem.**
- The partner at `/p/shiv-neel-i8wtg` is named "Shiv Neel"; his real name is **Shiv Lal**.
- The partner referral index uses three inconsistent role labels — "Mortgage broker", "Finance broker", "Partner". Every partner is a mortgage broker EXCEPT Shiv, who is a tax agent.

**Change.**
- **Name:** correct "Shiv Neel" → "Shiv Lal" everywhere it appears (his referral page hero card caption, page `<title>`/meta, alt text, and the partner index card). Grep the codebase for `Shiv Neel` to catch all instances. Keep the existing URL slug `shiv-neel-i8wtg` live so shared links don't break; only change visible text. (If a clean slug is wanted later, add `shiv-lal-…` and 301 the old one — not required now.)
- **Role labels:** set every partner card's role label to **"Mortgage broker"**, except Shiv Lal → **"Tax agent"** (matches his page's "Co-Founder & Tax Agent · Gen Z Tax Advisory"). Specifically:
  - Dylan Bertovic: Finance broker → Mortgage broker.
  - Matt Curle: Finance broker → Mortgage broker.
  - Hung Chuy: Partner → Mortgage broker.
  - Jay Morosi: Partner → Mortgage broker.
  - Sam Wetzler: Partner → Mortgage broker.
  - Shiv (Neel → Lal): Partner → Tax agent.
  - Alex Pagonis, Julianne Zammit, Justin Purll, Patrick Noll: already "Mortgage broker" — leave.
- Introduce one shared role constant/enum so future partners default to "Mortgage broker" and only explicit exceptions (Shiv) differ — prevents this drift recurring. Keep the existing label styling (rust uppercase eyebrow); only the text values change.

**Data.** These labels are a `role`/`type` field per partner record (or hard-coded per card) — locate and update.

**Mobile.** Confirm the index grid collapses to 1–2 columns and eyebrow labels + names don't wrap awkwardly with the new values.

**Acceptance.**
- No occurrence of "Shiv Neel" remains; his name reads "Shiv Lal" on his page and in the index.
- Every partner index card except Shiv reads "Mortgage broker"; Shiv reads "Tax agent".
- Role value comes from a single shared source.

---

## 9. ITEM 8 — Upcoming dates rework (client milestones)

**Problems.**
- Notes typed when adding a date don't appear anywhere after saving.
- Dates are added one at a time; Luke wants to add several milestones for one client in one action.
- Milestones should be tickable when met; when all of a client's milestones are done, the client should be archivable into a "Completed clients" list (with Reopen).
- Urgency colours are backwards/confusing (a 19-day item showed green while a 12-day item showed grey).

**Change.**
- **Fix the notes bug first.** Verify the `POST /api/admin/milestones` payload includes `notes` and that the list render prints it. Persist and display `notes` on each milestone row (as a sub-line or tooltip) in admin (and the client date view if that surfaces notes). This is a real bug — fix before enhancements.
- **Multi-date entry.** Pick the client once, then add multiple milestone rows (type + date + optional notes) via "Add another milestone", and save all with one button labelled "Save N dates". Client-side build an array; POST them in one request; server appends each and writes one audit entry.
- **Tick-off + archive.** Each milestone gets a complete (tick) action setting `completed:true, completedAt`. When all of a client's milestones are complete, offer "Archive client" → moves them into a Completed clients list, out of the active view, with a "Reopen" action.
- **Urgency colour logic (monotonic).** Colour encodes proximity, derived at render time from `date - today` in whole days:
  - Past due → dark red (distinct).
  - < 7 days → red `#f08080` (most urgent).
  - 7–14 days → amber `#e8a87c`.
  - 14+ days → green `#6dbf7b`.
  - Add a one-line legend. Don't store the colour — compute it.

**Data.**
- Milestone shape: `{ id, clientId, type, date, notes, completed:false, completedAt:null }` in the milestones store.
- Archive: a per-client flag (e.g. `client.datesArchived = true` or a `completedAt` on the client's milestone group). Completed section reads archived groups; Reopen clears the flag.

**Mobile.** Add-panel milestone rows stack (type, date, notes stacked within each row card); active milestone list is single-column cards with the tick on the right; completed clients list stacks.

**Acceptance.**
- Adding a milestone with notes shows those notes after save.
- Luke can add ≥ 2 milestones for one client in a single save.
- Ticking all of a client's milestones enables archiving; archived client appears under Completed clients and can be reopened.
- A nearer date is always a hotter colour than a further one; legend present.

---

## 10. ITEM 9 — Client management roster redesign (admin)

**Problem.** The client table works but feels inefficient and unpolished.

**Change.** Move from a wide sparse table to compact client rows/cards:
- Avatar initials + name with an inline active-status dot (green when `active`); email as a sub-line.
- Market chips in the middle (rust-tinted pills), wrapping as needed.
- A tidy action cluster on the right: icon buttons for Brief, Dates, Notify, plus an overflow "…" menu for Edit, Delete, and secondary actions (collapse destructive actions to reduce misclicks).
- Dates icon shows a small count badge when milestones exist (e.g. "2").

**Data.** No API change — same client data re-laid-out.

**Mobile.** Rows become stacked cards; market chips wrap; the action cluster becomes a full-width icon+label button row (Brief / Dates / Notify / …) as in the mobile mockup.

**Acceptance.**
- Roster reads as designed cards, not a spreadsheet, at both widths.
- All existing actions remain reachable (primary visible, secondary in overflow).
- Active status and milestone count are visible per client.

---

## 11. Data-model changes summary

- **Presentation `riskProfile`** → `{ enabled, risks:[{id,label,icon,on,imageUrl,notes}] }`, with a read-time migration from the old `{bushfireImageUrl, floodImageUrl, notes}` shape (Item 2).
- **Milestones** → add `notes`, `completed`, `completedAt`; add a per-client archived/completed flag (Item 8).
- **Partner records** → normalise the role/label field; single shared default (Item 7/10).
- No other store changes shape. Client names, markets, and presentation access continue to resolve live from `fairway-clients` — that live resolution is what makes admin↔client sync reliable (Item 5).

---

## 12. Suggested build order

1. **Quick wins / bugs:** Item 7+10 (Shiv name + partner labels), Item 1 (demographics grid), Item 6 (collapse 2FA), and the Item 8 notes-not-saving bug. Small, high-confidence, visible.
2. **Sync + names:** Item 5 (assigned client names + assign/revoke gating + market gating). Highest-value correctness fix.
3. **Builder polish:** Item 3 (client picker), Item 2 (extensible risk profile + migration), Item 4 (section discipline + curated client render order).
4. **Roster + dates:** Item 9 (client management redesign), Item 8 full rework (multi-add, tick-off, archive, urgency legend).

Commit after each item. For Items 2, 5, and 8, manually run the acceptance checks (they involve data round-trips and cross-portal effects) before moving on. Re-check every item at ~360px and ~768px widths for the mobile-parity requirement.

---

## 13. Reference mockups

Visual mockups of the four redesigned screens (desktop + mobile) were produced alongside this spec in the Fairway design review. They show: the redesigned client picker, the Analysis tab (demographics + extensible risk list), the upcoming-dates rework, and the admin client-management + presentation tables. This document is the source of truth for behaviour; the mockups illustrate the intended look and the brand colours listed in section 1.
