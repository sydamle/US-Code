#!/usr/bin/env python3
"""
Aggregate per-title title_toc.json files into a single master toc.json
for the multi-title US Code browser.

Usage:
    python3 scripts/build_toc.py <data-dir> <output-toc-path>

  <data-dir>       Directory containing title_toc_*.json files produced by
                   parse_xml.py for each title (e.g. public/data/).
  <output-toc-path> Where to write the combined toc.json
                   (e.g. src/data/toc.json).

The script reads every title_toc_*.json file, sorts titles numerically,
then emits the combined TocData JSON used by the React app at build time.
"""

import json
import re
import sys
from pathlib import Path


def title_sort_key(title):
    """Sort '1','2',...,'10',... numerically; letters sort after digits."""
    m = re.match(r'^(\d+)([A-Z]*)$', title['number'])
    if m:
        return (int(m.group(1)), m.group(2))
    return (9999, title['number'])


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 build_toc.py <data-dir> <output-toc-path>")
        sys.exit(1)

    data_dir = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    toc_files = sorted(data_dir.glob('title_toc_*.json'))
    if not toc_files:
        print(f"No title_toc_*.json files found in {data_dir}")
        sys.exit(1)

    titles = []
    release_point = ''
    updated = ''

    for f in toc_files:
        with open(f, encoding='utf-8') as fh:
            entry = json.load(fh)
        titles.append(entry)
        # Use the newest updated date
        if entry.get('updated', '') > updated:
            updated = entry['updated']
        # Extract release point from version string (e.g. "Online@119-73not60")
        if not release_point and entry.get('version'):
            m = re.search(r'@(.+)$', entry['version'])
            if m:
                release_point = m.group(1)

    titles.sort(key=title_sort_key)

    # Strip version/updated from per-title entries (not needed in toc.json)
    for t in titles:
        t.pop('version', None)
        t.pop('updated', None)

    toc_data = {
        'releasePoint': release_point or 'unknown',
        'updated': updated or '',
        'titles': titles,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as fh:
        json.dump(toc_data, fh, ensure_ascii=False, indent=2)

    print(f"Wrote toc.json with {len(titles)} titles -> {output_path}")


if __name__ == '__main__':
    main()
