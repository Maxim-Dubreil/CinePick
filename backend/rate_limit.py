"""Per-user sliding-window rate limiter — process-local, no persistence.

Guards the routes that spend a third-party quota (Gemini, TMDB, Letterboxd
scraping) against one account hammering them. Same trade-off as `cache.py`:
lost on restart and not shared across processes, fine while the backend runs
as a single uvicorn process (revisit if it ever scales out).
"""

import math
import time
from collections import deque


class RateLimiter:
    """Allows at most `max_calls` per key within any rolling `window_seconds`.

    Sliding window log: each key keeps the timestamps of its recent calls, so
    a burst right at a fixed-window boundary can't double the allowance.
    `clock` defaults to `time.monotonic`; tests inject a fake one.
    """

    def __init__(self, max_calls: int, window_seconds: float, *, clock=time.monotonic):
        self._max_calls = max_calls
        self._window_seconds = window_seconds
        self._clock = clock
        self._calls: dict[str, deque[float]] = {}

    def hit(self, key: str) -> int | None:
        """Record a call for `key`. Returns `None` when allowed, otherwise the
        number of seconds until the next call would be (the `Retry-After`)."""
        now = self._clock()
        calls = self._calls.setdefault(key, deque())
        while calls and now - calls[0] >= self._window_seconds:
            calls.popleft()
        if len(calls) >= self._max_calls:
            return max(1, math.ceil(calls[0] + self._window_seconds - now))
        calls.append(now)
        return None

    def reset(self) -> None:
        """Forget every key — for tests sharing one module-level limiter."""
        self._calls.clear()
