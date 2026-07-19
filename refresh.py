#!/usr/bin/env python3
"""
Fairway region report refresh CLI.

Usage:
  python refresh.py <region> --dry-run              Show fetch plan, no calls made
  python refresh.py <region> --demo cache-hit       Prove cache hit logic
  python refresh.py <region> --demo budget-abort    Prove budget guard
  python refresh.py <region> --status               Show cache + ledger state

  (Full live refresh — stage 3):
  python refresh.py <region>                        Claude orchestrates MCP calls
"""

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).parent
sys.path.insert(0, str(BASE))

from lib.config import load_region, active_overrides
from lib.cache import is_fresh, read as cache_read, seed_demo, delete_demo, status_table
from lib.ledger import (
    append as ledger_append,
    session_rows,
    session_cost,
    check_budget,
    build_entry,
    remove_by_refresh_id,
    print_summary,
    BudgetExceededError,
)
from lib.fetch import build_plan, print_dry_run, REQUIRED_CALLS


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_slug(slug: str) -> dict:
    cfg_path = BASE / "config" / "regions" / f"{slug}.json"
    if not cfg_path.exists():
        print(f"Error: No region config at {cfg_path.relative_to(BASE)}")
        print(f"  Available regions: "
              + ", ".join(p.stem for p in (BASE / "config" / "regions").glob("*.json")))
        sys.exit(1)
    return load_region(slug)


# ── Demo 1: cache hit ─────────────────────────────────────────────────────────

def demo_cache_hit(slug: str) -> None:
    region_cfg = _validate_slug(slug)
    tool = "get_market_summary"

    print(f"\n{'=' * 60}")
    print(f"  DEMO 1: Cache hit  ·  {region_cfg['displayName']}")
    print(f"{'=' * 60}")

    fake = {
        "lga": region_cfg["geography"]["lgas"][0],
        "houseMedian": 760000,
        "unitMedian": 555000,
        "grossYieldHouse": 4.2,
        "_demo": True,
    }

    # Step 1 — confirm stale before seeding
    assert not is_fresh(slug, tool), f"Unexpected pre-existing cache for {tool!r}"
    print(f"\n  [1] Pre-check: no existing cache for {tool!r}  ✓")

    # Step 2 — seed fake cache
    path = seed_demo(slug, tool, fake, rows_returned=1)
    print(f"  [2] Seeded demo cache entry:")
    print(f"      {path.relative_to(BASE)}")

    # Step 3 — simulate fetch layer behaviour
    print(f"  [3] Fetch layer checks is_fresh({slug!r}, {tool!r})...")
    assert is_fresh(slug, tool), "is_fresh() returned False on seeded entry"
    print(f"      is_fresh = True  →  cache read, no MCP call, no ledger entry  ✓")

    cached = cache_read(slug, tool)
    assert cached is not None
    assert cached["data"]["_demo"] is True
    print(f"      fetchedAt: {cached['fetchedAt']}")
    print(f"      rows:      {cached['rowsReturned']}  (no charge)")
    print(f"      data keys: {list(cached['data'].keys())}")

    # Step 4 — clean up
    delete_demo(slug, tool)
    assert not is_fresh(slug, tool), "Delete failed"
    print(f"  [4] Demo cache entry removed  ✓")

    print(f"\n  RESULT: Cache hit logic verified.")
    print(f"          Fresh entries skip MCP calls entirely — zero rows, zero cost.")
    print(f"{'=' * 60}\n")


# ── Demo 2: budget abort ───────────────────────────────────────────────────────

def demo_budget_abort(slug: str) -> None:
    region_cfg = _validate_slug(slug)
    max_rows = region_cfg["fetch"]["maxRowsPerRefresh"]
    demo_id = f"demo-{uuid.uuid4().hex[:8]}"
    headroom = 4  # leave only 4 rows free to trigger abort on next call

    print(f"\n{'=' * 60}")
    print(f"  DEMO 2: Budget abort  ·  {region_cfg['displayName']}")
    print(f"  Row limit: {max_rows}  ·  Demo refresh ID: {demo_id}")
    print(f"{'=' * 60}")

    # Step 1 — seed ledger to near-limit
    seed_rows = max_rows - headroom
    fake_entry = build_entry(
        refresh_id=demo_id,
        region=slug,
        tool="get_market_trends_price",
        tier="Standard",
        tier_confirmed=True,
        budget_tier="Standard",
        budget_cost_per_row=0.0310,
        rows_returned=seed_rows,
        from_cache=False,
        cache_key=f"data/cache/{slug}/get_market_trends_price/demo.json",
    )
    fake_entry["_demo"] = True
    ledger_append(fake_entry)

    used = session_rows(demo_id)
    cost = session_cost(demo_id)
    print(f"\n  [1] Seeded ledger: {used} rows used  (${cost:.4f} estimated)")
    print(f"      Budget headroom: {max_rows - used} rows")

    # Step 2 — attempt a call that would breach the limit
    next_tool = "get_market_trends_vacancy"
    est_rows = 12
    print(f"\n  [2] Attempting fetch: '{next_tool}'  (est. {est_rows} rows)")
    print(f"      Would push total to {used + est_rows} > {max_rows} limit")

    aborted = False
    try:
        check_budget(demo_id, max_rows, est_rows, next_tool)
    except BudgetExceededError as exc:
        aborted = True
        print(f"\n      BUDGET ABORT  ✓")
        print(f"      {exc}")

    assert aborted, "Budget guard did not abort — this is a bug"
    print(f"\n  [3] Confirmed: no MCP call made, no additional ledger entry")
    print(f"      Rows at abort: {session_rows(demo_id)}")
    print(f"      Cost at abort: ${session_cost(demo_id):.4f}")

    # Step 4 — clean up
    removed = remove_by_refresh_id(demo_id)
    assert session_rows(demo_id) == 0, "Demo ledger entries not fully removed"
    print(f"\n  [4] {removed} demo ledger entry removed  ✓")

    print(f"\n  RESULT: Budget guard verified.")
    print(f"          Any call that would push rows past {max_rows} is hard-aborted.")
    print(f"          No API call is made. No charge. Ledger shows the abort point.")
    print(f"{'=' * 60}\n")


# ── Demo 3 / --dry-run ────────────────────────────────────────────────────────

def cmd_dry_run(slug: str) -> None:
    _validate_slug(slug)
    print_dry_run(slug)


# ── Status ────────────────────────────────────────────────────────────────────

def cmd_status(slug: str) -> None:
    region_cfg = _validate_slug(slug)
    tools = [t for t, _, _ in REQUIRED_CALLS]
    rows = status_table(slug, tools)
    pinned = active_overrides(region_cfg)
    fresh_count = sum(1 for r in rows if r["fresh"])
    max_rows = region_cfg["fetch"]["maxRowsPerRefresh"]

    print(f"\n{'=' * 60}")
    print(f"  STATUS  ·  {region_cfg['displayName'].upper()}")
    print(f"{'=' * 60}")
    print(f"  Cache: {fresh_count}/{len(tools)} endpoints fresh this month")
    for r in rows:
        tag = "FRESH" if r["fresh"] else "STALE"
        print(f"    {tag}  {r['tool']}")
    if pinned:
        print(f"\n  [PINNED] overrides: {', '.join(pinned)}")
    print(f"\n  Row budget: {max_rows} rows/refresh")
    print(f"  Run --dry-run to see estimated costs for stale endpoints.")
    print(f"{'=' * 60}\n")


# ── Entrypoint ────────────────────────────────────────────────────────────────

USAGE = """\
Usage:
  python refresh.py <region> --dry-run
  python refresh.py <region> --demo cache-hit
  python refresh.py <region> --demo budget-abort
  python refresh.py <region> --status

  Regions: geelong, bendigo  (add more in config/regions/)
"""


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(USAGE)
        sys.exit(1)

    slug = args[0]
    flags = args[1:]

    if "--dry-run" in flags or flags == ["--demo", "dry-run"]:
        cmd_dry_run(slug)

    elif "--demo" in flags:
        try:
            demo_name = flags[flags.index("--demo") + 1]
        except IndexError:
            print("Error: --demo requires a name: cache-hit | budget-abort | dry-run")
            sys.exit(1)
        dispatch = {
            "cache-hit":    demo_cache_hit,
            "budget-abort": demo_budget_abort,
            "dry-run":      cmd_dry_run,
        }
        if demo_name not in dispatch:
            print(f"Error: Unknown demo {demo_name!r}. Choose: cache-hit | budget-abort | dry-run")
            sys.exit(1)
        dispatch[demo_name](slug)

    elif "--status" in flags:
        cmd_status(slug)

    else:
        print("Full live refresh (stage 3) is not yet implemented.")
        print("The cache, ledger, and budget guard are in place.")
        print("Run the three demos first, then confirm for stage 3.\n")
        print(USAGE)
        sys.exit(0)


if __name__ == "__main__":
    main()
