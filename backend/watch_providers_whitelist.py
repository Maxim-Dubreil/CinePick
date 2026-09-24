"""Static FR watch-provider whitelist for CIN-103.

TMDB lists ~96 raw FR providers (`GET /watch/providers/movie?watch_region=FR`,
checked 2026-09-24), mostly duplicate storefronts and "channel" bundles for
the same handful of real platforms (e.g. Netflix's ad tier and Paramount+'s
Amazon Channel resale are distinct `provider_id`s). This module hand-picks
~15 platforms users actually recognize and folds every variant into its
canonical id — everything else is dropped.
"""

CANONICAL_PROVIDERS: dict[int, str] = {
    # Free (with or without ads) — the 7 legal free platforms named in CIN-103.
    234: "Arte",
    300: "Pluto TV",
    538: "Plex",
    147: "M6+",
    1754: "TF1+",
    1967: "Molotov",
    2670: "Novo 19",
    # Subscription
    8: "Netflix",
    119: "Amazon Prime Video",
    337: "Disney+",
    350: "Apple TV+",
    381: "Canal+",
    531: "Paramount+",
    # Rent / buy
    2: "Apple TV",
    10: "Amazon Video",
    3: "Google Play Films",
}

# Raw TMDB provider_id -> the canonical id above it should be folded into.
# Each is a separate storefront TMDB tracks for the same real platform.
VARIANT_TO_CANONICAL: dict[int, int] = {
    1796: 8,  # Netflix Standard with Ads -> Netflix
    582: 531,  # Paramount+ Amazon Channel -> Paramount+
    2243: 350,  # Apple TV Amazon Channel -> Apple TV+
}


def resolve(provider_id: int) -> int | None:
    """Canonical provider_id for a raw TMDB provider_id, or None if it's not whitelisted."""
    canonical_id = VARIANT_TO_CANONICAL.get(provider_id, provider_id)
    return canonical_id if canonical_id in CANONICAL_PROVIDERS else None
