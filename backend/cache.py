"""Generic in-memory TTL cache — process-local, no persistence.

Deliberately not backed by the DB: built for data that's cheap to re-fetch
and changes too often to be worth storing durably (TMDB watch providers
today, ratings or other volatile TMDB-derived data later — see CIN-103).
Lost on restart, not shared across backend processes; fine at CinePick's
current scale (revisit only if that becomes a real bottleneck).

One `TTLCache` instance per kind of cached value (see `watch_providers.py`
for the usage pattern) — not a single shared cache keyed by a compound key,
so each caller picks its own TTL and key type.
"""

import time
from dataclasses import dataclass


@dataclass
class _Entry[V]:
    value: V
    expires_at: float


class TTLCache[K, V]:
    """A dict keyed by `K`, where each entry expires `ttl_seconds` after
    being `set`. `clock` defaults to `time.monotonic` (immune to wall-clock
    adjustments); tests inject a fake one to control expiry deterministically."""

    def __init__(self, ttl_seconds: float, *, clock=time.monotonic):
        self._ttl_seconds = ttl_seconds
        self._clock = clock
        self._entries: dict[K, _Entry[V]] = {}

    def get(self, key: K) -> V | None:
        """The cached value, or None if it was never set or has expired.
        An expired entry is evicted on read rather than left to linger."""
        entry = self._entries.get(key)
        if entry is None:
            return None
        if self._clock() >= entry.expires_at:
            del self._entries[key]
            return None
        return entry.value

    def set(self, key: K, value: V) -> None:
        self._entries[key] = _Entry(value, self._clock() + self._ttl_seconds)
