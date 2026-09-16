"""Tests for the hard-filter porting (CIN-49). Pure functions, no I/O."""

import filtering


def test_duration_bucket_boundaries():
    assert filtering.duration_bucket(89) == "lt90"
    assert filtering.duration_bucket(90) == "90-120"
    assert filtering.duration_bucket(119) == "90-120"
    assert filtering.duration_bucket(120) == "120-150"
    assert filtering.duration_bucket(149) == "120-150"
    assert filtering.duration_bucket(150) == "150plus"


def test_duration_bucket_missing_runtime_is_none():
    assert filtering.duration_bucket(None) is None


def test_era_bucket_boundaries():
    assert filtering.era_bucket(1929) == "silent"
    assert filtering.era_bucket(1930) == "golden"
    assert filtering.era_bucket(1959) == "golden"
    assert filtering.era_bucket(1960) == "newwave"
    assert filtering.era_bucket(1979) == "newwave"
    assert filtering.era_bucket(1980) == "blockbuster"
    assert filtering.era_bucket(1999) == "blockbuster"
    assert filtering.era_bucket(2000) == "2000s"
    assert filtering.era_bucket(2014) == "2000s"
    assert filtering.era_bucket(2015) == "recent"


def test_era_bucket_missing_year_is_none():
    assert filtering.era_bucket(None) is None
