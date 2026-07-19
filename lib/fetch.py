"""Fetch planning for region report data pulls.

Defines the canonical set of HtAG calls needed for a full region refresh,
in cheapest-tier-first order (so if a budget abort occurs, the most
expensive calls are skipped first).

The actual MCP execution is NOT done here — that is Claude's job.
This module handles: plan generation, cache-status checks, budget pre-flight,
and the row/cost estimates used in dry-run output and budget guards.
"""
from __future__ import annotations

from lib.config import load_whitelist, load_region, active_overrides
from lib.cache import is_fresh, status_table

# ── Required calls for a full region refresh ──────────────────────────────────
# Order: Standard → Enhanced → Restricted (cheapest first).
# Budget aborts hit the most expensive calls, minimising wasted spend.
#
# (tool_name, estimated_rows, params_to_pass)
#
# Row estimates are conservative upper bounds based on maxMonths params and
# expected API cardinality. Actual rows confirmed on first live call.

REQUIRED_CALLS: list[tuple[str, int, dict]] = [
    # Standard tier
    ("get_market_summary",               1,  {}),
    ("get_market_trends_price",         24,  {"maxMonths": 24}),
    ("get_market_trends_rent",          24,  {"maxMonths": 24}),
    ("get_market_trends_yield",         24,  {"maxMonths": 24}),
    ("get_census_medians",               5,  {}),
    # Enhanced tier
    ("get_market_growth_annualised",     8,  {}),
    ("get_market_trends_demand_profile", 12, {"maxMonths": 12}),
    # Restricted tier — most expensive; placed last so budget aborts skip these
    ("get_market_trends_vacancy",        12, {"maxMonths": 12}),
    ("get_market_trends_days_on_market", 12, {"maxMonths": 12}),
    ("get_market_trends_clearance_rate", 12, {"maxMonths": 12}),
    ("get_market_trends_inventory",      12, {"maxMonths": 12}),
]
# Total estimated rows: 1+24+24+24+5+8+12+12+12+12+12 = 146 (under 150 limit)


class WhitelistError(Exception):
    pass


def _effective_budget(cfg: dict, tier_rates: dict) -> tuple[str, float]:
    """Return (budget_tier_name, cost_per_row) for ledger purposes.

    Unconfirmed tools are budgeted at Restricted regardless of their tier field.
    """
    if cfg.get("tierConfirmed"):
        return cfg["tier"], tier_rates[cfg["tier"]]
    return (
        cfg.get("ledgerBudgetTier", "Restricted"),
        cfg.get("ledgerBudgetCostPerRow", tier_rates["Restricted"]),
    )


def build_plan(slug: str) -> list[dict]:
    """Return the full fetch plan as a list of call descriptors.

    Each dict contains all information needed to check cache, estimate cost,
    enforce budget, make the call, and write the ledger entry.
    """
    whitelist = load_whitelist()
    tools = whitelist["tools"]
    tier_rates = whitelist["tierRates"]
    region_cfg = load_region(slug)

    plan = []
    for tool, est_rows, params in REQUIRED_CALLS:
        if tool not in tools:
            raise WhitelistError(f"Tool {tool!r} is not in the whitelist — fetch plan broken")
        cfg = tools[tool]
        if not cfg.get("enabled"):
            raise WhitelistError(f"Tool {tool!r} is disabled in whitelist — fetch plan broken")

        budget_tier, budget_rate = _effective_budget(cfg, tier_rates)
        fresh = is_fresh(slug, tool)

        # Merge whitelist params with call-specific params (call-level wins on conflict)
        merged_params = {**cfg.get("params", {}), **params}

        plan.append({
            "tool":          tool,
            "tier":          cfg["tier"],
            "tierConfirmed": bool(cfg.get("tierConfirmed")),
            "budgetTier":    budget_tier,
            "budgetRate":    budget_rate,
            "estRows":       est_rows,
            "estCost":       round(budget_rate * est_rows, 4),
            "params":        merged_params,
            "fresh":         fresh,
            "monthlyCap":    cfg.get("monthlyCap"),
            "dedupeKey":     cfg.get("deduplicationKey"),
        })

    return plan


def print_dry_run(slug: str) -> None:
    """Print a full fetch plan with cache status and cost estimates. No calls made."""
    region_cfg = load_region(slug)
    max_rows = region_cfg["fetch"]["maxRowsPerRefresh"]
    pinned = active_overrides(region_cfg)
    plan = build_plan(slug)

    stale = [p for p in plan if not p["fresh"]]
    cached = [p for p in plan if p["fresh"]]
    total_est_rows = sum(p["estRows"] for p in stale)
    total_est_cost = sum(p["estCost"] for p in stale)
    over_budget = total_est_rows > max_rows

    W = 72
    print(f"\n{'=' * W}")
    print(f"  DRY-RUN  ·  {region_cfg['displayName'].upper()}  ·  no calls will be made")
    print(f"{'=' * W}")

    # Cache status
    print(f"\n  CACHE STATUS  ({len(cached)} fresh, {len(stale)} stale)")
    for p in plan:
        tag = "FRESH" if p["fresh"] else "STALE"
        print(f"    {tag}  {p['tool']}")

    if not stale:
        print(f"\n  All {len(plan)} endpoints are cached — run --render to generate the report.")
        _print_pinned(pinned)
        print(f"{'=' * W}\n")
        return

    # Fetch plan table
    print(f"\n  FETCH PLAN  ({len(stale)} call{'s' if len(stale) != 1 else ''}  ·  "
          f"cheapest tier first)")
    print(f"  {'Tool':<44} {'BudgetTier':<12} {'Rows':>5}  {'Rate':>10}  {'Est.Cost':>10}")
    print(f"  {'-'*44} {'-'*12} {'-'*5}  {'-'*10}  {'-'*10}")

    for p in stale:
        unconf = "" if p["tierConfirmed"] else "*"
        print(
            f"  {p['tool']:<44} {p['budgetTier']:<12}{unconf} "
            f"{p['estRows']:>5}  ${p['budgetRate']:>9.4f}  ${p['estCost']:>9.4f}"
        )

    print(f"  {'-'*44} {'-'*12} {'-'*5}  {'-'*10}  {'-'*10}")
    print(f"  {'TOTAL':<44} {'':<12} {total_est_rows:>5}  {'':>10}  ${total_est_cost:>9.4f}")

    unconfirmed_count = sum(1 for p in stale if not p["tierConfirmed"])
    if unconfirmed_count:
        print(f"\n  * {unconfirmed_count} tool(s) budgeted at Restricted (tier unconfirmed). "
              f"Actual cost may be lower.")

    # Budget status
    print(f"\n  BUDGET:  {total_est_rows} / {max_rows} rows estimated")
    if over_budget:
        print(f"  !! ESTIMATE EXCEEDS BUDGET — actual rows may differ; "
              f"budget guard runs per-call at runtime")
    else:
        print(f"  Headroom: {max_rows - total_est_rows} rows")

    print(f"\n  Note: First 25 rows per endpoint are free (one-time, per endpoint).")
    print(f"  All estimates at list price (unlinked account, 1.0x rate).")
    print(f"  Account link (~17% discount) available once usage is established.")

    _print_pinned(pinned)
    print(f"{'=' * W}\n")


def _print_pinned(pinned: list) -> None:
    if pinned:
        print(f"\n  [PINNED] overrides active — these fields render from config, not fetched data:")
        for f in pinned:
            print(f"    · {f}")
        print(f"  Review before publishing — pinned values do not auto-refresh.")
