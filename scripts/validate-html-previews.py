#!/usr/bin/env python3
"""Validate HTML stamp preview rendering across all HTML stamps.

Usage:
    python3 scripts/validate-html-previews.py                   # Check all cached
    python3 scripts/validate-html-previews.py --sample 50       # Random sample of 50
    python3 scripts/validate-html-previews.py --refresh         # Force re-render
    python3 scripts/validate-html-previews.py --refresh-failed  # Re-render only failed
"""
import argparse
import json
import random
import sys
import time
import urllib.request
import urllib.error

BASE_URL = "https://stampchain.io"
MIN_VALID_SIZE = 5_000  # Below this = likely blank render


def fetch_html_stamps():
    """Fetch all HTML stamp numbers from the API."""
    stamps = []
    page = 1
    while True:
        url = f"{BASE_URL}/api/v2/stamps?filetype=html&limit=100&page={page}&sortBy=ASC"
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read())

        batch = data.get("data", [])
        if not batch:
            break

        for s in batch:
            stamps.append({
                "stamp": s["stamp"],
                "tx_hash": s["tx_hash"],
                "stamp_url": s.get("stamp_url", ""),
            })

        print(f"  Page {page}: {len(batch)} stamps")
        page += 1
        if len(batch) < 100:
            break

    return stamps


def test_preview(stamp_num, refresh=False):
    """Test a single stamp's preview endpoint. Returns result dict."""
    suffix = "?refresh=true" if refresh else ""
    url = f"{BASE_URL}/api/v2/stamp/{stamp_num}/preview{suffix}"

    try:
        req = urllib.request.Request(url, method="GET")
        # Don't follow redirects — we want to see 302s
        opener = urllib.request.build_opener(NoRedirectHandler())
        resp = opener.open(req, timeout=60)

        code = resp.status
        headers = {k.lower(): v for k, v in resp.getheaders()}
        body = resp.read()
        size = len(body)

        return {
            "http_code": code,
            "size": size,
            "content_type": headers.get("content-type", ""),
            "cache": headers.get("x-cache", ""),
            "recursive": headers.get("x-recursive", ""),
            "engine": headers.get("x-rendering-engine", ""),
            "method": headers.get("x-conversion-method", ""),
            "location": "",
        }
    except urllib.error.HTTPError as e:
        if e.code == 302:
            location = e.headers.get("Location", "")
            return {
                "http_code": 302,
                "size": 0,
                "content_type": "",
                "cache": e.headers.get("x-cache", ""),
                "recursive": "",
                "engine": "",
                "method": "",
                "location": location,
            }
        return {
            "http_code": e.code,
            "size": 0,
            "content_type": "",
            "cache": "",
            "recursive": "",
            "engine": "",
            "method": "",
            "location": "",
        }
    except Exception as e:
        return {
            "http_code": 0,
            "size": 0,
            "content_type": "",
            "cache": "",
            "recursive": "",
            "engine": "",
            "method": "",
            "location": str(e),
        }


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Handler that raises on redirects so we can inspect 302s."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(
            req.full_url, code, msg, headers, fp
        )


def classify(result):
    """Classify a preview result."""
    code = result["http_code"]
    size = result["size"]
    loc = result["location"]

    if code == 200 and size >= MIN_VALID_SIZE:
        return "OK"
    if code == 200 and size < MIN_VALID_SIZE:
        return "BLANK"
    if code == 302:
        if "logo" in loc or "opengraph" in loc:
            return "FALLBACK"
        return "REDIRECT"
    if code == 0:
        return "TIMEOUT"
    return f"HTTP_{code}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=0, help="Random sample size")
    parser.add_argument("--refresh", action="store_true", help="Force re-render all")
    parser.add_argument("--refresh-failed", action="store_true",
                        help="Re-render only failed/blank stamps")
    args = parser.parse_args()

    print("=== HTML Stamp Preview Validation ===\n")

    # Fetch all HTML stamps
    print("[1/4] Fetching HTML stamp list...")
    all_stamps = fetch_html_stamps()
    print(f"  Total: {len(all_stamps)} HTML stamps\n")

    # Sample if requested
    test_stamps = all_stamps
    if 0 < args.sample < len(all_stamps):
        test_stamps = random.sample(all_stamps, args.sample)
        print(f"  Testing random sample of {len(test_stamps)}\n")

    # Test each preview
    print(f"[2/4] Testing {len(test_stamps)} preview endpoints...")
    results = []
    counts = {"OK": 0, "BLANK": 0, "FALLBACK": 0, "REDIRECT": 0, "TIMEOUT": 0, "OTHER": 0}

    for i, stamp in enumerate(test_stamps):
        num = stamp["stamp"]
        r = test_preview(num, refresh=args.refresh)
        status = classify(r)

        results.append({
            "stamp": num,
            "tx_hash": stamp["tx_hash"],
            "status": status,
            **r,
        })

        key = status if status in counts else "OTHER"
        counts[key] = counts.get(key, 0) + 1

        # Progress every 10 or on non-OK
        if (i + 1) % 10 == 0 or status != "OK":
            sys.stdout.write(
                f"  [{i+1}/{len(test_stamps)}] #{num}: {status}"
                f" (HTTP {r['http_code']}, {r['size']}B"
                f"{', recursive' if r['recursive'] == 'true' else ''}"
                f"{', ' + r['engine'] if r['engine'] else ''})\n"
            )
            sys.stdout.flush()

        # Rate limit
        time.sleep(0.5 if args.refresh else 0.1)

    # Summary
    print(f"\n[3/4] Results Summary")
    print("=" * 40)
    total = len(test_stamps)
    print(f"  Total tested:    {total}")
    print(f"  OK (valid PNG):  {counts['OK']} ({100*counts['OK']//total}%)")
    print(f"  Blank render:    {counts['BLANK']}")
    print(f"  Fallback/logo:   {counts['FALLBACK']}")
    print(f"  Redirect (S3):   {counts['REDIRECT']}")
    print(f"  Timeout:         {counts['TIMEOUT']}")
    print(f"  Other errors:    {counts['OTHER']}")

    # Failed details
    failed = [r for r in results if r["status"] not in ("OK", "REDIRECT")]
    if failed:
        print(f"\n[4/4] {len(failed)} stamps need investigation:")
        print("-" * 60)
        for r in failed:
            print(
                f"  #{r['stamp']} ({r['tx_hash'][:16]}...) "
                f"status={r['status']} HTTP={r['http_code']} "
                f"size={r['size']}B cache={r['cache']}"
            )
            if r["location"]:
                print(f"    -> {r['location'][:80]}")

        # If --refresh-failed, re-render the failures
        if args.refresh_failed:
            print(f"\n  Re-rendering {len(failed)} failed stamps...")
            fixed = 0
            for r in failed:
                r2 = test_preview(r["stamp"], refresh=True)
                s2 = classify(r2)
                marker = "FIXED" if s2 == "OK" else "STILL_FAILED"
                print(f"    #{r['stamp']}: {r['status']} -> {s2} ({marker}, {r2['size']}B)")
                if s2 == "OK":
                    fixed += 1
                time.sleep(1)  # Rate limit re-renders
            print(f"\n  Fixed {fixed}/{len(failed)} stamps on re-render")
    else:
        print(f"\n[4/4] All {total} HTML stamps rendered successfully!")

    # Return exit code based on failure rate
    fail_rate = len(failed) / total if total > 0 else 0
    sys.exit(1 if fail_rate > 0.05 else 0)  # Fail if >5% broken


if __name__ == "__main__":
    main()
