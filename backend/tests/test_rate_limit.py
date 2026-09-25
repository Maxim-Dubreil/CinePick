from rate_limit import RateLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_allows_up_to_max_calls_then_blocks():
    limiter = RateLimiter(max_calls=3, window_seconds=60, clock=FakeClock())

    assert [limiter.hit("u1") for _ in range(3)] == [None, None, None]
    assert limiter.hit("u1") is not None


def test_allowance_comes_back_as_the_window_slides():
    clock = FakeClock()
    limiter = RateLimiter(max_calls=2, window_seconds=60, clock=clock)
    limiter.hit("u1")
    clock.now = 30
    limiter.hit("u1")

    clock.now = 59
    assert limiter.hit("u1") is not None
    # The first call (t=0) leaves the window at t=60, freeing exactly one slot.
    clock.now = 60
    assert limiter.hit("u1") is None
    assert limiter.hit("u1") is not None


def test_retry_after_is_time_until_oldest_call_expires():
    clock = FakeClock()
    limiter = RateLimiter(max_calls=1, window_seconds=60, clock=clock)
    limiter.hit("u1")

    clock.now = 45.5
    assert limiter.hit("u1") == 15  # 14.5 s rounded up


def test_blocked_calls_do_not_extend_the_window():
    clock = FakeClock()
    limiter = RateLimiter(max_calls=1, window_seconds=60, clock=clock)
    limiter.hit("u1")
    clock.now = 30
    limiter.hit("u1")  # refused, must not be recorded

    clock.now = 60
    assert limiter.hit("u1") is None


def test_keys_have_independent_allowances():
    limiter = RateLimiter(max_calls=1, window_seconds=60, clock=FakeClock())
    limiter.hit("u1")

    assert limiter.hit("u1") is not None
    assert limiter.hit("u2") is None
