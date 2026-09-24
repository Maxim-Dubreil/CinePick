"""Tests for the generic in-memory TTL cache (CIN-103)."""

from cache import TTLCache


def _fake_clock(start: float = 0.0):
    """A controllable clock: `now[0] = X` advances it, the cache reads `now[0]`."""
    now = [start]
    return now, lambda: now[0]


def test_get_missing_key_returns_none():
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10)
    assert cache.get("missing") is None


def test_set_then_get_returns_the_value():
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10)
    cache.set("a", 1)
    assert cache.get("a") == 1


def test_different_keys_do_not_collide():
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10)
    cache.set("a", 1)
    cache.set("b", 2)
    assert cache.get("a") == 1
    assert cache.get("b") == 2


def test_set_overwrites_existing_value_and_resets_expiry():
    now, clock = _fake_clock()
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10, clock=clock)
    cache.set("a", 1)
    now[0] = 9
    cache.set("a", 2)  # resets expiry to 9 + 10 = 19
    now[0] = 15
    assert cache.get("a") == 2


def test_get_before_expiry_returns_the_value():
    now, clock = _fake_clock()
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10, clock=clock)
    cache.set("a", 1)
    now[0] = 9.999
    assert cache.get("a") == 1


def test_get_at_or_after_expiry_returns_none():
    now, clock = _fake_clock()
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10, clock=clock)
    cache.set("a", 1)
    now[0] = 10
    assert cache.get("a") is None


def test_expired_entry_is_evicted_not_just_hidden():
    """A second `get` after expiry must not resurrect the entry, and a stale
    entry must not silently linger in memory forever."""
    now, clock = _fake_clock()
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10, clock=clock)
    cache.set("a", 1)
    now[0] = 10
    assert cache.get("a") is None
    assert "a" not in cache._entries  # asserting the eviction itself, not just the None
    assert cache.get("a") is None
