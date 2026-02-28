#!/usr/bin/env python3
"""
Parse a USLM XML file for any US Code title and generate structured JSON.

Usage:
    python3 scripts/parse_xml.py <path-to-uscNN.xml> <output-dir>

Output files written to <output-dir>/:
    t{N}.json          – sections map for this title (lazy-loaded by the app)
    title_toc.json     – lightweight TOC entry for this title (aggregated later)

To download XML for a title (e.g. Title 17):
    curl -L \\
        -H "User-Agent: Mozilla/5.0" \\
        -H "Referer: https://uscode.house.gov/download/download.shtml" \\
        "https://uscode.house.gov/download/releasepoints/us/pl/119/73not60/xml_usc17@119-73not60.zip" \\
        -o title17.zip && unzip title17.zip
"""

import xml.etree.ElementTree as ET
import json
import sys
import re
from pathlib import Path

NS = 'http://xml.house.gov/schemas/uslm/1.0'

def tag(local):
    return f'{{{NS}}}{local}'

def local_name(el):
    return el.tag.replace(f'{{{NS}}}', '') if el.tag.startswith(f'{{{NS}}}') else el.tag

def escape_html(text):
    if not text:
        return ''
    return (text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;'))

def inline_to_html(el):
    """Convert an element's mixed content to an HTML string."""
    result = ''
    if el.text:
        result += escape_html(el.text)
    for child in el:
        ln = local_name(child)
        inner = inline_to_html(child)
        if ln == 'ref':
            href = escape_html(child.get('href', ''))
            result += f'<a href="{href}" class="ref">{inner}</a>'
        elif ln == 'date':
            result += f'<span class="date">{inner}</span>'
        elif ln in ('em', 'i'):
            result += f'<em>{inner}</em>'
        elif ln in ('strong', 'b'):
            result += f'<strong>{inner}</strong>'
        elif ln == 'sup':
            result += f'<sup>{inner}</sup>'
        elif ln == 'sub':
            result += f'<sub>{inner}</sub>'
        elif ln == 'term':
            result += f'<dfn>{inner}</dfn>'
        elif ln == 'br':
            result += '<br/>'
        else:
            result += inner
        if child.tail:
            result += escape_html(child.tail)
    return result

def get_full_text(el):
    """Get plain text content of element, stripping all tags."""
    if el is None:
        return ''
    parts = []
    if el.text:
        parts.append(el.text)
    for child in el:
        parts.append(get_full_text(child))
        if child.tail:
            parts.append(child.tail)
    return ''.join(parts)

# USLM structural element types
STRUCTURAL_ELEMENTS = {
    'subsection', 'paragraph', 'subparagraph', 'clause',
    'subclause', 'item', 'subitem', 'subsubitem'
}

def parse_section_to_blocks(section_el):
    """Parse a section element into a flat list of content blocks."""
    blocks = []
    _visit_element(section_el, blocks, depth=0)
    return blocks

def _visit_element(el, blocks, depth):
    """
    Recursively visit an element and emit content blocks.
    depth=0 means section level, depth=1 means subsection, etc.
    """
    for child in el:
        ln = local_name(child)

        # Skip non-content elements
        if ln in ('num', 'heading', 'sourceCredit', 'notes', 'toc', 'layout',
                   'header', 'tocItem', 'metadata'):
            continue

        # Handle structural subdivisions recursively
        if ln in STRUCTURAL_ELEMENTS:
            _visit_structural(child, blocks, depth + 1, ln)
            continue

        # Handle block-level text containers at section level
        if ln in ('chapeau', 'content', 'continuation', 'flush'):
            html = _container_to_html(child)
            if html.strip():
                blocks.append({
                    'type': ln,
                    'indent': depth,
                    'html': html,
                })
            continue

        # Handle a raw paragraph
        if ln == 'p':
            html = inline_to_html(child)
            if html.strip():
                cls = child.get('class', '')
                indent = _indent_from_class(cls) if cls else depth
                blocks.append({
                    'type': 'p',
                    'indent': indent,
                    'html': html,
                })
            continue

        # Handle tables
        if ln == 'table':
            html = _table_to_html(child)
            if html.strip():
                blocks.append({
                    'type': 'table',
                    'indent': depth,
                    'html': html,
                })
            continue

def _indent_from_class(cls):
    for i in range(6, -1, -1):
        if f'indent{i}' in cls:
            return i
    return 0

def _visit_structural(el, blocks, depth, el_type):
    """
    Visit a structural element (subsection, paragraph, etc.).
    Emits one block for the intro line, then recurses into children.
    """
    indent = depth

    num_el = el.find(tag('num'))
    heading_el = el.find(tag('heading'))

    num_html = f'<span class="num">{escape_html(num_el.text)}</span>' if num_el is not None and num_el.text else ''
    heading_html = f'<span class="enum-heading">{inline_to_html(heading_el)}</span>' if heading_el is not None else ''

    chapeau_el = el.find(tag('chapeau'))
    content_el = el.find(tag('content'))

    if chapeau_el is not None:
        body_html = _container_to_html(chapeau_el)
        intro_html = f'{num_html} {heading_html}{body_html}'.strip()
        if intro_html:
            blocks.append({'type': el_type, 'indent': indent, 'html': intro_html})
        for child in el:
            ln = local_name(child)
            if ln in STRUCTURAL_ELEMENTS:
                _visit_structural(child, blocks, depth + 1, ln)
        cont_el = el.find(tag('continuation'))
        if cont_el is not None:
            cont_html = _container_to_html(cont_el)
            if cont_html.strip():
                blocks.append({'type': 'continuation', 'indent': indent, 'html': cont_html})

    elif content_el is not None:
        body_html = _container_to_html(content_el)
        intro_html = f'{num_html} {heading_html}{body_html}'.strip()
        if intro_html:
            blocks.append({'type': el_type, 'indent': indent, 'html': intro_html})
        for child in el:
            ln = local_name(child)
            if ln in STRUCTURAL_ELEMENTS:
                _visit_structural(child, blocks, depth + 1, ln)

    else:
        header_html = f'{num_html} {heading_html}'.strip()

        has_structural = any(local_name(c) in STRUCTURAL_ELEMENTS for c in el)
        inline_parts = []
        for child in el:
            ln = local_name(child)
            if ln in ('num', 'heading', 'sourceCredit', 'notes'):
                continue
            if ln in STRUCTURAL_ELEMENTS:
                continue
            if ln == 'p':
                inline_parts.append(inline_to_html(child))
            elif ln not in ('chapeau', 'content'):
                inline_parts.append(inline_to_html(child))

        if inline_parts:
            body_html = ''.join(inline_parts)
            intro_html = f'{num_html} {heading_html}{body_html}'.strip()
            blocks.append({'type': el_type, 'indent': indent, 'html': intro_html})
        elif header_html:
            blocks.append({'type': el_type, 'indent': indent, 'html': header_html})

        for child in el:
            ln = local_name(child)
            if ln in STRUCTURAL_ELEMENTS:
                _visit_structural(child, blocks, depth + 1, ln)

def _container_to_html(el):
    """Convert a container element (chapeau, content, etc.) to HTML."""
    result = ''
    if el.text:
        result += escape_html(el.text)
    for child in el:
        ln = local_name(child)
        if ln == 'p':
            inner = inline_to_html(child)
            cls = child.get('class', '')
            result += f'<p class="{cls}">{inner}</p>'
        else:
            result += inline_to_html(child)
        if child.tail:
            result += escape_html(child.tail)
    return result

def _table_to_html(el):
    """Convert a table element to a simple HTML table."""
    rows = []
    for row in el.iter(tag('tr')):
        cells = []
        for cell in row:
            ln = local_name(cell)
            if ln in ('td', 'th'):
                inner = inline_to_html(cell)
                attrs = ''
                colspan = cell.get('colspan', '')
                rowspan = cell.get('rowspan', '')
                if colspan:
                    attrs += f' colspan="{colspan}"'
                if rowspan:
                    attrs += f' rowspan="{rowspan}"'
                cells.append(f'<{ln}{attrs}>{inner}</{ln}>')
        if cells:
            rows.append(f'<tr>{"".join(cells)}</tr>')
    return f'<table class="usc-table">{"".join(rows)}</table>' if rows else ''

def get_source_credit(section_el):
    sc_el = section_el.find(tag('sourceCredit'))
    return get_full_text(sc_el).strip() if sc_el is not None else ''

def _note_to_html(note_el):
    """Convert a <note> element's body (excluding its <heading>) to HTML."""
    parts = []
    for child in note_el:
        ln = local_name(child)
        if ln == 'heading':
            continue
        if ln == 'p':
            inner = inline_to_html(child)
            if inner.strip():
                cls = child.get('class', '')
                if cls:
                    parts.append(f'<p class="{cls}">{inner}</p>')
                else:
                    parts.append(f'<p>{inner}</p>')
        elif ln == 'note':
            inner_html = _note_to_html(child)
            sub_heading_el = child.find(tag('heading'))
            sub_heading = get_full_text(sub_heading_el).strip() if sub_heading_el is not None else ''
            if sub_heading:
                parts.append(f'<p class="subnote-heading">{escape_html(sub_heading)}</p>')
            if inner_html:
                parts.append(inner_html)
        else:
            inner = inline_to_html(child)
            if inner.strip():
                parts.append(f'<p>{inner}</p>')
        if child.tail and child.tail.strip():
            parts.append(escape_html(child.tail))
    return ''.join(parts)

def get_notes(section_el):
    """Extract the <notes> element into a list of note dicts."""
    notes_el = section_el.find(tag('notes'))
    if notes_el is None:
        return []

    notes = []
    for note_el in notes_el.findall(tag('note')):
        topic = note_el.get('topic', 'miscellaneous')
        heading_el = note_el.find(tag('heading'))
        heading = get_full_text(heading_el).strip() if heading_el is not None else ''
        html = _note_to_html(note_el)
        notes.append({'topic': topic, 'heading': heading, 'html': html})

    return notes

def parse_section(section_el):
    identifier = section_el.get('identifier', '')
    num_el = section_el.find(tag('num'))
    heading_el = section_el.find(tag('heading'))

    num_val = num_el.get('value', '') if num_el is not None else ''
    num_text = (num_el.text or '') if num_el is not None else ''
    heading_text = get_full_text(heading_el).strip() if heading_el is not None else ''

    content_blocks = parse_section_to_blocks(section_el)
    source_credit = get_source_credit(section_el)
    notes = get_notes(section_el)

    return {
        'number': num_val,
        'numText': num_text,
        'heading': heading_text,
        'identifier': identifier,
        'content': content_blocks,
        'sourceCredit': source_credit,
        'notes': notes,
    }

# Structural containers that sit between title and chapter (or between chapter and section)
# These are preserved in the tree rather than flattened.
_STRUCTURAL_CONTAINERS = {
    'subtitle', 'part', 'subpart', 'subchapter', 'division', 'subdivision'
}

# All container types including chapter
_ALL_CONTAINERS = _STRUCTURAL_CONTAINERS | {'chapter'}


def _parse_container_node(el, node_type):
    """Parse a structural container element (subtitle, part, chapter, etc.) into a TocNode dict."""
    identifier = el.get('identifier', '')
    num_el = el.find(tag('num'))
    heading_el = el.find(tag('heading'))

    num_text = (num_el.text or '') if num_el is not None else ''
    heading_text = get_full_text(heading_el).strip() if heading_el is not None else ''

    num_val = num_el.get('value', '') if num_el is not None else ''
    if not num_val:
        # Try extracting Roman or alphanumeric value from text
        m = re.search(r'([IVXLCDMivxlcdm]+|\d+[A-Z]*)', num_text)
        num_val = m.group(1) if m else num_text.strip()

    heading_clean = heading_text.rstrip('—').strip()

    children = _build_children(el)

    section_count = _count_sections(children)
    print(f"  {node_type.capitalize()} {num_val}: {heading_clean} ({section_count} sections)")

    return {
        'type': node_type,
        'number': num_val,
        'heading': heading_clean,
        'identifier': identifier,
        'children': children,
    }


def _count_sections(children):
    """Count leaf section nodes recursively."""
    count = 0
    for child in children:
        if 'type' in child:
            count += _count_sections(child['children'])
        else:
            count += 1
    return count


def _build_children(el):
    """
    Build the list of children for a structural container.
    Children are either sub-containers (TocNode) or leaf sections (TocSection).
    """
    children = []
    for child in el:
        ln = local_name(child)
        if ln == 'section':
            sec = parse_section(child)
            children.append({
                'number': sec['number'],
                'numText': sec['numText'],
                'heading': sec['heading'],
                'identifier': sec['identifier'],
            })
        elif ln in _ALL_CONTAINERS:
            children.append(_parse_container_node(child, ln))
    return children


def _build_title_children(title_el):
    """Build the top-level children list for a title element."""
    return _build_children(title_el)


# Keep a flat helper for collecting all sections (used for t{N}.json)
def _collect_all_sections_flat(el, sections):
    """Recursively collect all <section> elements into a flat list."""
    for child in el:
        ln = local_name(child)
        if ln == 'section':
            sections.append(parse_section(child))
        elif ln in _ALL_CONTAINERS:
            _collect_all_sections_flat(child, sections)

def extract_title_number(title_el, identifier):
    """Extract title number from identifier attribute or num element."""
    # Try identifier: /us/usc/t17 → '17'
    if identifier:
        m = re.search(r'/t(\d+[A-Z]*)', identifier)
        if m:
            return m.group(1)
    # Try num element value attribute
    num_el = title_el.find(tag('num'))
    if num_el is not None:
        val = num_el.get('value', '')
        if val:
            # Strip leading zeros: '017' → '17'
            m = re.match(r'^0*(\d+[A-Z]*)$', val)
            if m:
                return m.group(1)
        if num_el.text:
            m = re.search(r'(\d+)', num_el.text)
            if m:
                return m.group(1)
    return None

def title_name_from_heading(heading_text):
    """Convert ALL CAPS heading to title case name."""
    # Keep known abbreviations uppercase
    skip = {'US', 'U.S.', 'USC', 'USA', 'FBI', 'CIA', 'IRS', 'DOD', 'DOJ',
            'DOE', 'EPA', 'FDA', 'FTC', 'SEC', 'FCC', 'FAA', 'FEMA'}
    words = heading_text.strip().split()
    result = []
    for w in words:
        if w in skip:
            result.append(w)
        else:
            result.append(w.capitalize())
    return ' '.join(result)

def parse_title(xml_path):
    print(f"Parsing {xml_path}...")
    tree = ET.parse(xml_path)
    root = tree.getroot()

    meta = root.find(tag('meta'))
    version = ''
    updated = ''
    if meta is not None:
        doc_pub = meta.find(tag('docPublicationName'))
        created = meta.find('{http://purl.org/dc/terms/}created')
        if doc_pub is not None:
            version = doc_pub.text or ''
        if created is not None:
            updated = (created.text or '').split('T')[0]

    main_el = root.find(tag('main'))
    title_el = main_el.find(tag('title')) if main_el is not None else None

    if title_el is None:
        raise ValueError(f"No <title> element found in {xml_path}")

    identifier = title_el.get('identifier', '')
    title_num = extract_title_number(title_el, identifier)
    if not title_num:
        raise ValueError(f"Could not determine title number from {xml_path}")

    heading_el = title_el.find(tag('heading'))
    title_heading_raw = get_full_text(heading_el).strip() if heading_el is not None else ''
    title_name = title_name_from_heading(title_heading_raw) if title_heading_raw else f'Title {title_num}'

    children = []
    all_sections_flat = []
    if title_el is not None:
        children = _build_title_children(title_el)
        _collect_all_sections_flat(title_el, all_sections_flat)

    return {
        'number': title_num,
        'name': title_name,
        'heading': title_heading_raw,
        'identifier': identifier,
        'version': version,
        'updated': updated,
        'children': children,
        '_all_sections': all_sections_flat,
    }

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 parse_xml.py <uscNN.xml> <output-dir>")
        sys.exit(1)

    xml_path = sys.argv[1]
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    title_data = parse_title(xml_path)
    title_num = title_data['number']

    # ── t{N}.json — sections map for lazy loading ──────────────────────────
    # Collect full section data from parse_title's internal parse results.
    # We re-traverse the XML via the stored full-section results in title_data.
    all_sections_flat = title_data.get('_all_sections', [])
    all_sections = {s['number']: s for s in all_sections_flat}
    sections_path = output_dir / f't{title_num}.json'
    with open(sections_path, 'w', encoding='utf-8') as f:
        json.dump(all_sections, f, ensure_ascii=False)
    section_count = len(all_sections)
    print(f"Wrote {section_count} sections -> {sections_path}")

    # ── title_toc.json — lightweight TOC for this title ───────────────────
    # children is the full hierarchy tree (TocNode | TocSection items)
    toc_entry = {
        'number': title_num,
        'name': title_data['name'],
        'identifier': title_data['identifier'],
        'version': title_data['version'],
        'updated': title_data['updated'],
        'children': title_data['children'],
    }
    toc_path = output_dir / 'title_toc.json'
    with open(toc_path, 'w', encoding='utf-8') as f:
        json.dump(toc_entry, f, ensure_ascii=False, indent=2)
    print(f"Wrote TOC entry -> {toc_path}")

    total_blocks = sum(len(s['content']) for s in all_sections_flat)
    print(f"\nTitle {title_num}: {section_count} sections, {total_blocks} content blocks")

if __name__ == '__main__':
    main()
