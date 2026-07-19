from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).parent.parent  # fairway-site/


def _current_ym() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _cache_path(region: str, tool: str, ym: str) -> Path:
    return BASE / "data" / "cache" / region / tool / f"{ym}.json"


def is_fresh(region: str, tool: str) -> bool:
    """True if a cache file exists for the current calendar month."""
    return _cache_path(region, tool, _current_ym()).exists()


def read(region: str, tool: str) -> dict | None:
    """Return cached envelope dict, or None if no fresh cache exists."""
    path = _cache_path(region, tool, _current_ym())
    if not path.exists():
        return None
    return json.loads(path.read_text())


def write(region: str, tool: str, params: dict, rows_returned: int, raw_data: dict | list) -> Path:
    """Persist data to cache for the current calendar month. Returns the path."""
    ym = _current_ym()
    path = _cache_path(region, tool, ym)
    path.parent.mkdir(parents=True, exist_ok=True)
    envelope = {
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "calendarMonth": ym,
        "region": region,
        "tool": tool,
        "params": params,
        "rowsReturned": rows_returned,
        "data": raw_data,
    }
    path.write_text(json.dumps(envelope, indent=2, ensure_ascii=True))
    return path


def seed_demo(region: str, tool: str, fake_data: dict, rows_returned: int = 1) -> Path:
    """Write a fake cache entry for demo/test purposes."""
    return write(region, tool, {"_demo": True}, rows_returned, fake_data)


def delete_demo(region: str, tool: str) -> None:
    """Remove the current-month cache file for a tool (demo cleanup only)."""
    path = _cache_path(region, tool, _current_ym())
    if path.exists():
        path.unlink()


def status_table(region: str, tools: list[str]) -> list[dict]:
    """Return a list of {tool, fresh, path} dicts for a set of tools."""
    ym = _current_ym()
    result = []
    for tool in tools:
        path = _cache_path(region, tool, ym)
        result.append({"tool": tool, "fresh": path.exists(), "path": path})
    return result
