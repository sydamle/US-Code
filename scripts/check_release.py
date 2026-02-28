#!/usr/bin/env python3
"""
Check uscode.house.gov for new US Code release points.

Scrapes the main download page (download.shtml) to find the current release
point by extracting it from ZIP download links (e.g. xml_usc17@119-73not60.zip).

Usage:
    python3 scripts/check_release.py [--current-toc src/data/toc.json]

Exits with code 0 and prints the new release point if an update is available.
Exits with code 1 if already up to date.
Exits with code 2 on error.

When a new release is found, prints a single line to stdout:
    NEW_RELEASE=119-80not60
All diagnostic output goes to stderr so stdout is machine-readable.
"""

import json
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

DOWNLOAD_PAGE = "https://uscode.house.gov/download/download.shtml"


class LinkParser(HTMLParser):
    """Extract href values from <a> tags in an HTML page."""

    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            for name, value in attrs:
                if name == 'href' and value:
                    self.links.append(value)


def fetch_page(url):
    """Fetch a URL and return its HTML content."""
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; USCodeBrowser/1.0)',
        'Referer': 'https://uscode.house.gov/',
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='replace')


def extract_release_from_links(html):
    """
    Extract the release point from ZIP download links on the page.

    Looks for links matching patterns like:
        xml_usc17@119-73not60.zip
        usc-rp@119-73not60.htm
    Returns the release point string (e.g. '119-73not60') or None.
    """
    parser = LinkParser()
    parser.feed(html)

    release_points = set()
    for link in parser.links:
        # Match ZIP links: xml_usc17@119-73not60.zip
        m = re.search(r'xml_usc\d+@([\w-]+)\.zip', link)
        if m:
            release_points.add(m.group(1))
            continue
        # Match release point page links: usc-rp@119-73not60.htm
        m = re.search(r'usc-rp@([\w-]+)\.htm', link)
        if m:
            release_points.add(m.group(1))

    if not release_points:
        return None

    # If multiple found, pick the one with the highest law number
    return max(release_points, key=_release_sort_key)


def extract_release_from_text(html):
    """
    Fallback: extract release point from page text like
    'current through Public Law 119-73 (01/23/2026), except 119-60'
    and construct the release point string '119-73not60'.
    """
    # Match "Public Law {congress}-{law} ... except {congress}-{excluded}"
    m = re.search(
        r'Public Law (\d+)-(\d+)[^,]*,\s*except\s+\d+-(\d+)',
        html
    )
    if m:
        congress, law, excluded = m.group(1), m.group(2), m.group(3)
        return f"{congress}-{law}not{excluded}"

    # Match without exception: "Public Law {congress}-{law}"
    m = re.search(r'Public Law (\d+)-(\d+)', html)
    if m:
        return f"{m.group(1)}-{m.group(2)}"

    return None


def parse_release_point(rp_string):
    """
    Parse a release point string like '119-73not60' into (congress, law_number).
    Returns (0, 0) if parsing fails.
    """
    m = re.match(r'^(\d+)-(\d+)', rp_string)
    if not m:
        return (0, 0)
    return (int(m.group(1)), int(m.group(2)))


def _release_sort_key(rp_string):
    """Sort key for release point strings."""
    congress, law = parse_release_point(rp_string)
    return (congress, law)


def get_current_release(toc_path):
    """Read the current release point from toc.json."""
    with open(toc_path, encoding='utf-8') as f:
        toc = json.load(f)
    return toc.get('releasePoint', '')


def main():
    toc_path = Path('src/data/toc.json')

    # Parse args
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--current-toc' and i + 1 < len(args):
            toc_path = Path(args[i + 1])
            i += 2
        else:
            i += 1

    # Get current release point
    if toc_path.exists():
        current_rp = get_current_release(toc_path)
    else:
        current_rp = ''

    current_congress, current_law = parse_release_point(current_rp) if current_rp else (0, 0)
    print(f"Current release point: {current_rp} (congress={current_congress}, law={current_law})",
          file=sys.stderr)

    # Fetch the main download page
    print(f"Fetching {DOWNLOAD_PAGE} ...", file=sys.stderr)
    try:
        html = fetch_page(DOWNLOAD_PAGE)
    except Exception as e:
        print(f"Error fetching download page: {e}", file=sys.stderr)
        sys.exit(2)

    # Extract release point from download links (primary method)
    latest_rp = extract_release_from_links(html)

    # Fallback: extract from page text
    if not latest_rp:
        print("No release point found in links, trying text extraction...", file=sys.stderr)
        latest_rp = extract_release_from_text(html)

    if not latest_rp:
        print("Could not determine latest release point from download page.", file=sys.stderr)
        sys.exit(2)

    latest_congress, latest_law = parse_release_point(latest_rp)
    print(f"Latest release point: {latest_rp} (congress={latest_congress}, law={latest_law})",
          file=sys.stderr)

    # Compare
    if latest_congress > current_congress or \
       (latest_congress == current_congress and latest_law > current_law):
        print(f"Update available: {current_rp} -> {latest_rp}", file=sys.stderr)
        # Machine-readable output to stdout
        print(f"NEW_RELEASE={latest_rp}")
        sys.exit(0)
    else:
        print(f"Already up to date at {current_rp}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
