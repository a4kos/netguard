import pytest
from threat_intelligence import scan_code, scan_permissions, _PATTERNS, _SEVERITY_SCORES


def test_scan_code_no_matches():
    code = "console.log('hello world');"
    flags = scan_code(code)
    assert flags == []


def test_scan_code_keylogger():
    code = "document.addEventListener('keydown', function() {});"
    flags = scan_code(code)
    assert len(flags) > 0
    assert any("Keylogger" in flag["label"] for flag in flags)


def test_scan_code_crypto_miner():
    code = "miner.start();"
    flags = scan_code(code)
    assert len(flags) > 0
    assert any("Crypto miner" in flag["label"] for flag in flags)


def test_scan_permissions():
    permissions = ["debugger", "webRequest", "cookies"]
    score = scan_permissions(permissions)
    assert score > 0  # Should have some risk


def test_scan_permissions_empty():
    permissions = []
    score = scan_permissions(permissions)
    assert score == 0


def test_patterns_structure():
    for category, data in _PATTERNS.items():
        assert "severity" in data
        assert "label" in data
        assert "patterns" in data
        assert data["severity"] in _SEVERITY_SCORES