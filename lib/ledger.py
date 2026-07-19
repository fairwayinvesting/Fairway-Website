from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).parent.parent  # fairway-site/
LEDGER_PATH = BASE / "data" / "usage-ledger.json"


class BudgetExceededError(Exception):
    pass


# ── I/O ───────────────────────────────────────────────────────────────────────

def _load() -> list:
    if not LEDGER_PATH.exists():
        return []
    text = LEDGER_PATH.read_text()
    return json.loads(text) if text.strip() else []


def _save(entries: list) -> None:
    LEDGER_PATH.write_text(json.dumps(entries, indent=2, ensure_ascii=True))


# ── Public API ────────────────────────────────────────────────────────────────

def append(entry: dict) -> None:
    """Append one entry to the usage ledger (append-only)."""
    entries = _load()
    entries.append(entry)
    _save(entries)


def session_rows(refresh_id: str) -> int:
    """Total non-cached rows charged in a given refresh session."""
    return sum(
        e.get("rowsReturned", 0)
        for e in _load()
        if e.get("refreshId") == refresh_id and not e.get("fromCache")
    )


def session_cost(refresh_id: str) -> float:
    """Total estimated cost (AUD) for a given refresh session."""
    return sum(
        e.get("estimatedCostAUD", 0.0)
        for e in _load()
        if e.get("refreshId") == refresh_id and not e.get("fromCache")
    )


def check_budget(refresh_id: str, max_rows: int, est_additional_rows: int, tool: str) -> None:
    """Raise BudgetExceededError if this call would push over the row limit."""
    used = session_rows(refresh_id)
    if used + est_additional_rows > max_rows:
        raise BudgetExceededError(
            f"BUDGET ABORT: {used} rows used + {est_additional_rows} estimated "
            f"for '{tool}' = {used + est_additional_rows} > {max_rows} row limit. "
            f"Aborting — no call made."
        )


def build_entry(
    refresh_id: str,
    region: str,
    tool: str,
    tier: str,
    tier_confirmed: bool,
    budget_tier: str,
    budget_cost_per_row: float,
    rows_returned: int,
    from_cache: bool,
    cache_key: str,
    pinned: bool = False,
) -> dict:
    """Construct a standardised ledger entry dict."""
    cost = 0.0 if from_cache else round(budget_cost_per_row * rows_returned, 6)
    entry = {
        "ts":              datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "refreshId":       refresh_id,
        "region":          region,
        "tool":            tool,
        "tier":            tier,
        "tierConfirmed":   tier_confirmed,
        "budgetTier":      budget_tier,
        "budgetCostPerRow": budget_cost_per_row,
        "rowsReturned":    rows_returned,
        "estimatedCostAUD": cost,
        "fromCache":       from_cache,
        "cacheKey":        cache_key,
    }
    if pinned:
        entry["pinned"] = True
    if not tier_confirmed:
        entry["tierNote"] = "Budgeted at Restricted — confirm tier on developer.htagai.com"
    return entry


def remove_by_refresh_id(refresh_id: str) -> int:
    """Remove all entries for a refresh_id. Returns count removed."""
    entries = _load()
    kept = [e for e in entries if e.get("refreshId") != refresh_id]
    removed = len(entries) - len(kept)
    _save(kept)
    return removed


def print_summary(
    refresh_id: str,
    region: str,
    max_rows: int,
    pinned_fields: list | None = None,
) -> None:
    entries = [e for e in _load() if e.get("refreshId") == refresh_id]
    live_entries = [e for e in entries if not e.get("fromCache")]
    cache_hits = [e for e in entries if e.get("fromCache")]
    total_rows = sum(e.get("rowsReturned", 0) for e in live_entries)
    total_cost = sum(e.get("estimatedCostAUD", 0.0) for e in live_entries)
    ym = datetime.now(timezone.utc).strftime("%Y-%m")

    W = 68
    print(f"\n{'=' * W}")
    print(f"  LEDGER SUMMARY — {region.upper()}  —  {ym}")
    print(f"{'=' * W}")
    print(f"  {'Tool':<42} {'Rows':>5}  {'Est.Cost':>10}  {'Source'}")
    print(f"  {'-'*42} {'-'*5}  {'-'*10}  {'-'*8}")

    for e in entries:
        source = "CACHE" if e.get("fromCache") else e.get("budgetTier", e.get("tier", "?"))
        pin_mark = "  [PINNED]" if e.get("pinned") else ""
        unconf_mark = "*" if not e.get("tierConfirmed") and not e.get("fromCache") else ""
        print(
            f"  {e['tool']:<42} {e.get('rowsReturned', 0):>5}  "
            f"${e.get('estimatedCostAUD', 0):>9.4f}  {source}{unconf_mark}{pin_mark}"
        )

    print(f"  {'-'*42} {'-'*5}  {'-'*10}")
    print(f"  {'TOTAL (live calls)':<42} {total_rows:>5}  ${total_cost:>9.4f}")
    if cache_hits:
        print(f"  Cache hits: {len(cache_hits)} (no charge)")

    remaining = max_rows - total_rows
    budget_pct = int(100 * total_rows / max_rows) if max_rows else 0
    print(f"\n  Budget: {total_rows}/{max_rows} rows  ({budget_pct}%)  |  {remaining} rows remaining")

    if pinned_fields:
        print(f"\n  [PINNED] overrides active — these fields render from config, not live data:")
        for f in pinned_fields:
            print(f"    · {f}")
        print(f"  Review pinned values before publishing — they do not auto-refresh.")

    unconfirmed = [e for e in live_entries if not e.get("tierConfirmed")]
    if unconfirmed:
        print(f"\n  * {len(unconfirmed)} tool(s) budgeted at Restricted (tier unconfirmed).")
        print(f"    Confirm tiers at developer.htagai.com and update htag-endpoints.json.")

    print(f"{'=' * W}\n")
