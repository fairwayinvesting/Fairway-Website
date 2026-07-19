import json
from pathlib import Path
from lib.validate import assert_ascii_keys

BASE = Path(__file__).parent.parent  # fairway-site/


def load_region(slug: str) -> dict:
    path = BASE / "config" / "regions" / f"{slug}.json"
    data = json.loads(path.read_text())
    assert_ascii_keys(data)
    return data


def load_whitelist() -> dict:
    path = BASE / "config" / "htag-endpoints.json"
    data = json.loads(path.read_text())
    assert_ascii_keys(data)
    return data


def load_badge_thresholds() -> dict:
    path = BASE / "config" / "badge-thresholds.json"
    data = json.loads(path.read_text())
    assert_ascii_keys(data)
    return data


def load_content_json(region_cfg: dict) -> dict:
    path = BASE / region_cfg["content"]
    data = json.loads(path.read_text())
    assert_ascii_keys(data)
    return data


def load_content_md(region_cfg: dict) -> dict:
    """Parse content/{slug}.md into a dict keyed by ## section name."""
    md_path = BASE / region_cfg["content"].replace(".json", ".md")
    text = md_path.read_text(encoding="utf-8")
    sections = {}
    current_key = None
    buf = []
    for line in text.splitlines():
        if line.startswith("## "):
            if current_key is not None:
                sections[current_key] = "\n".join(buf).strip()
            current_key = line[3:].strip()
            buf = []
        elif current_key is not None:
            buf.append(line)
    if current_key is not None:
        sections[current_key] = "\n".join(buf).strip()
    return sections


def active_overrides(region_cfg: dict) -> list:
    """Return list of override field names that are pinned (non-null)."""
    overrides = region_cfg.get("overrides", {})
    pinned = []
    for k, v in overrides.items():
        if k.startswith("_"):
            continue
        if isinstance(v, dict):
            for sub_k, sub_v in v.items():
                if isinstance(sub_v, dict):
                    for leaf_k, leaf_v in sub_v.items():
                        if leaf_v is not None:
                            pinned.append(f"{k}.{sub_k}.{leaf_k}")
                elif sub_v is not None:
                    pinned.append(f"{k}.{sub_k}")
        elif v is not None:
            pinned.append(k)
    return pinned
