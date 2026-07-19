import re

_NON_ASCII = re.compile(r"[^\x00-\x7F]")


def assert_ascii_keys(obj, path=""):
    """Recursively check every dict key for non-ASCII characters.

    Raises ValueError with the offending key path on first violation.
    Call on every config/content file at load time.
    """
    if isinstance(obj, dict):
        for k, v in obj.items():
            full = f"{path}.{k}" if path else k
            m = _NON_ASCII.search(k)
            if m:
                raise ValueError(
                    f"Non-ASCII character (U+{ord(m.group()):04X} {m.group()!r}) "
                    f"in dict key at {full!r}. Use plain ASCII keys only."
                )
            assert_ascii_keys(v, full)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            assert_ascii_keys(item, f"{path}[{i}]")
