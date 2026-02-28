import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TocData, TocTitle, TocNode, TocNodeType, TocSection, SectionData, ContentBlock, NoteBlock, SectionsMap } from './types';
import tocJsonImport from './data/toc.json';
import { getReportsForSection, CongressionalReport } from './data/congressionalReports';

// TOC imported at build time for instant render
const tocData = tocJsonImport as TocData;

// ======== Per-title data fetching ========

const titleCache = new Map<string, SectionsMap>();
const titlePromises = new Map<string, Promise<SectionsMap>>();

function fetchTitle(titleNum: string): Promise<SectionsMap> {
  if (titleCache.has(titleNum)) return Promise.resolve(titleCache.get(titleNum)!);
  if (titlePromises.has(titleNum)) return titlePromises.get(titleNum)!;
  const p = fetch(`./data/t${titleNum}.json`)
    .then(r => {
      if (!r.ok) throw new Error(`Title ${titleNum} not found`);
      return r.json() as Promise<SectionsMap>;
    })
    .then(data => {
      titleCache.set(titleNum, data);
      return data;
    });
  titlePromises.set(titleNum, p);
  return p;
}

function useTitleSections(titleNum: string): SectionsMap | null | 'error' {
  const [sections, setSections] = useState<SectionsMap | null | 'error'>(
    titleCache.get(titleNum) ?? null,
  );
  useEffect(() => {
    setSections(titleCache.get(titleNum) ?? null);
    fetchTitle(titleNum)
      .then(setSections)
      .catch(() => setSections('error'));
  }, [titleNum]);
  return sections;
}

// ======== Utility ========

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part,
      )}
    </>
  );
}

// ======== USLM hierarchy tree helpers ========

/** A tree node has `children`; a leaf section has `numText`. */
function isSection(node: TocNode | TocSection): node is TocSection {
  return !('children' in node);
}

function flattenSections(nodes: Array<TocNode | TocSection>): TocSection[] {
  const result: TocSection[] = [];
  for (const node of nodes) {
    if (isSection(node)) {
      result.push(node);
    } else {
      result.push(...flattenSections(node.children));
    }
  }
  return result;
}

function flattenNodes(nodes: Array<TocNode | TocSection>): TocNode[] {
  const result: TocNode[] = [];
  for (const node of nodes) {
    if (!isSection(node)) {
      result.push(node);
      result.push(...flattenNodes(node.children));
    }
  }
  return result;
}

function countSections(nodes: Array<TocNode | TocSection>): number {
  return flattenSections(nodes).length;
}

function findSectionInTree(
  nodes: Array<TocNode | TocSection>,
  sectionNum: string,
): TocSection | null {
  for (const node of nodes) {
    if (isSection(node)) {
      if (node.number === sectionNum) return node;
    } else {
      const found = findSectionInTree(node.children, sectionNum);
      if (found) return found;
    }
  }
  return null;
}

/** Find the TocNode that directly contains the given section number. */
function findParentNode(
  nodes: Array<TocNode | TocSection>,
  sectionNum: string,
): TocNode | null {
  for (const node of nodes) {
    if (isSection(node)) continue;
    for (const child of node.children) {
      if (isSection(child) && child.number === sectionNum) return node;
    }
    const found = findParentNode(node.children, sectionNum);
    if (found) return found;
  }
  return null;
}

const NODE_TYPE_LABELS: Record<TocNodeType, string> = {
  subtitle: 'Subtitle',
  part: 'Part',
  subpart: 'Subpart',
  chapter: 'Chapter',
  subchapter: 'Subchapter',
  division: 'Division',
  subdivision: 'Subdivision',
};

function nodeShortLabel(node: TocNode): string {
  const label = NODE_TYPE_LABELS[node.type] ?? node.type;
  return node.number ? `${label} ${node.number}` : label;
}

function nodeAnchorId(node: TocNode): string {
  return `${node.type}-${node.number}`;
}

/** Returns the ordered list of ancestor TocNodes from root down to the section's parent. */
function findPathToSection(
  nodes: Array<TocNode | TocSection>,
  sectionNum: string,
  path: TocNode[] = [],
): TocNode[] | null {
  for (const node of nodes) {
    if (isSection(node)) {
      if (node.number === sectionNum) return path;
    } else {
      const result = findPathToSection(node.children, sectionNum, [...path, node]);
      if (result !== null) return result;
    }
  }
  return null;
}

// ======== Pre-computed lookups (built once at load time) ========

// Section counts per title (avoids re-flattening on every home-page render)
const titleSectionCounts = new Map<string, number>();
for (const title of tocData.titles) {
  titleSectionCounts.set(title.number, flattenSections(title.children).length);
}

// Pre-flattened sections and nodes per title for instant search
const titleSearchIndexes = new Map<
  string,
  { sections: TocSection[]; nodes: TocNode[] }
>();
for (const title of tocData.titles) {
  titleSearchIndexes.set(title.number, {
    sections: flattenSections(title.children),
    nodes: flattenNodes(title.children),
  });
}

// ======== Paragraph tools helpers (same as title17usc) ========

const STRUCTURAL_TYPES = new Set([
  'subsection', 'paragraph', 'subparagraph', 'clause', 'subclause', 'item', 'subitem',
]);

function splitBlockHtml(html: string): { numText: string; restHtml: string } | null {
  const m = html.match(/^(<span class="num">)(.*?)(<\/span>)([\s\S]*)$/);
  if (!m) return null;
  return { numText: m[2], restHtml: m[4] };
}

function buildParaMetaMap(
  blocks: ContentBlock[],
  sectionNum: string,
): Map<number, { path: string; id: string }> {
  const map = new Map<number, { path: string; id: string }>();
  const stack: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!STRUCTURAL_TYPES.has(block.type)) continue;
    const m = block.html.match(/<span class="num">(.*?)<\/span>/);
    if (!m) continue;
    const num = m[1];
    const depth = block.indent - 1;
    stack.length = depth;
    stack[depth] = num;
    const path = stack.slice(0, depth + 1).join('');
    const id = `p-${sectionNum}${path}`;
    map.set(i, { path, id });
  }
  return map;
}

// ======== § 101 / definition-section helpers ========

interface Sec101Def {
  slug: string;
  term: string;
  innerHtml: string;
  indentClass: string;
}

function parseSec101Defs(html: string): Sec101Def[] {
  const defs: Sec101Def[] = [];
  const re = /<p class="(indent\d+)">([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const indentClass = m[1];
    const innerHtml = m[2];
    if (indentClass === 'indent1') {
      const termMatch = innerHtml.match(/\u201c([^""\u201d]+)\u201d/);
      const term = termMatch ? termMatch[1] : '';
      const slug = term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      defs.push({ slug, term, innerHtml, indentClass });
    } else {
      defs.push({ slug: '', term: '', innerHtml, indentClass });
    }
  }
  return defs;
}

function splitAtFirstTerm(
  html: string,
  term: string,
): { before: string; after: string } | null {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(\u201c${escaped}\u201d)`);
  const idx = html.search(re);
  if (idx === -1) return null;
  const match = html.match(re);
  if (!match) return null;
  const end = idx + match[0].length;
  return { before: html.slice(0, idx), after: html.slice(end) };
}

// ======== Term Annotation (Title 17 only) ========
// Annotates defined terms from §§ 101 and 115(e) in statutory text.
// Uses a single-pass regex (terms sorted longest-first) so overlapping
// definitions from different sources never double-wrap the same text.

interface TermDef {
  term: string;
  slug: string;
  source: string; // '101' | '115e'
}

function buildTermAnnotator(termDefs: TermDef[]): (html: string) => string {
  const terms = termDefs
    .filter(d => d.term && d.slug)
    .sort((a, b) => b.term.length - a.term.length); // longest-first avoids partial matches
  if (terms.length === 0) return html => html;

  const infoByLower = new Map(
    terms.map(t => [t.term.toLowerCase(), { slug: t.slug, source: t.source }]),
  );
  const pattern = terms
    .map(t => {
      const esc = t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return esc.replace(/ /g, '\\s+');
    })
    .join('|');
  const termRe = new RegExp(`\\b(${pattern})\\b`, 'gi');

  return function annotate(html: string): string {
    const parts = html.split(/(<[^>]+>)/g);
    return parts
      .map((part, i) => {
        if (i % 2 === 1) return part; // HTML tag — leave unchanged
        return part.replace(termRe, match => {
          const info = infoByLower.get(match.toLowerCase());
          return info
            ? `<span class="def-term" data-slug="${info.slug}" data-def-source="${info.source}">${match}</span>`
            : match;
        });
      })
      .join('');
  };
}

// Collect the full definition HTML for a § 101 slug.
function getFullDefHtml(defs: Sec101Def[], slug: string): string {
  const idx = defs.findIndex(d => d.slug === slug);
  if (idx === -1) return '';
  const parts: string[] = [];
  for (let i = idx; i < defs.length; i++) {
    if (i > idx && defs[i].indentClass === 'indent1') break;
    parts.push(`<p class="def-popup-para ${defs[i].indentClass}">${defs[i].innerHtml}</p>`);
  }
  return parts.join('');
}

// ======== § 115(e) Definition Helpers ========

interface Sec115eDef {
  blockIndex: number; // index in section.content of the top-level definition block
  term: string;
  slug: string;
  anchor: string; // paragraph anchor for navigation, e.g. "(e)(1)"
  indent: number; // indent level of the definition block (2 for § 115(e))
}

function parseSec115eDefs(content: ContentBlock[]): Sec115eDef[] {
  const defs: Sec115eDef[] = [];
  let inE = false;
  for (let i = 0; i < content.length; i++) {
    const block = content[i];
    if (block.type === 'subsection' && /class="num">\(e\)/.test(block.html)) {
      inE = true;
      continue;
    }
    if (inE && block.type === 'subsection' && block.indent <= 1) break;
    if (!inE) continue;

    if (block.indent === 2) {
      const termMatch = block.html.match(/\u201c([^\u201d]+)\u201d/);
      if (termMatch) {
        const term = termMatch[1];
        const slug = term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const numMatch = block.html.match(/^<span class="num">([^<]+)<\/span>/);
        const designator = numMatch ? numMatch[1].trim() : '';
        defs.push({ blockIndex: i, term, slug, anchor: `(e)${designator}`, indent: 2 });
      }
    }
  }
  return defs;
}

function getSec115eDefHtml(content: ContentBlock[], def: Sec115eDef): string {
  const parts: string[] = [];
  for (let i = def.blockIndex; i < content.length; i++) {
    const block = content[i];
    if (i > def.blockIndex && block.indent <= def.indent) break;
    const relPad = (block.indent - def.indent) * 24;
    parts.push(
      `<div class="def-popup-block" style="padding-left:${relPad}px">${block.html}</div>`,
    );
  }
  return parts.join('');
}

// ======== Definition Term Popup ========

interface DefPopupState {
  slug: string;
  term: string;
  defHtml: string;
  label: string;       // e.g. "§\u202f101" or "§\u202f115(e)"
  navTarget: ViewState;
  x: number;
  y: number;
}

function DefTermPopup({
  popup,
  onClose,
  onNavigate,
}: {
  popup: DefPopupState;
  onClose: () => void;
  onNavigate: (v: ViewState) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const left = Math.max(8, Math.min(popup.x - 20, window.innerWidth - 508));
  const top = popup.y + 16;

  return (
    <div
      ref={ref}
      className="def-popup"
      style={{ position: 'fixed', left, top, zIndex: 300 }}
      role="dialog"
      aria-label={`Definition of ${popup.term}`}
    >
      <div className="def-popup-header">
        <span>{'\u201c'}{popup.term}{'\u201d'}</span>
        <span className="def-popup-tag">{popup.label}</span>
        <button className="def-popup-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="def-popup-body" dangerouslySetInnerHTML={{ __html: popup.defHtml }} />
      <div className="def-popup-footer">
        <button
          className="def-popup-goto"
          onClick={() => { onNavigate(popup.navTarget); onClose(); }}
        >
          View full definition in {popup.label} →
        </button>
      </div>
    </div>
  );
}

// ======== Popup ========

interface PopupState {
  id: string;
  url: string;
  citation: string;
}

function ParagraphPopup({
  url,
  citation,
  onClose,
}: {
  url: string;
  citation: string;
  onClose: () => void;
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCite, setCopiedCite] = useState(false);

  function copyText(text: string, which: 'url' | 'cite') {
    const set = which === 'url' ? setCopiedUrl : setCopiedCite;
    const write = navigator.clipboard?.writeText(text);
    if (write) {
      write.then(() => { set(true); setTimeout(() => set(false), 2000); });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      set(true);
      setTimeout(() => set(false), 2000);
    }
  }

  return (
    <div className="para-popup" role="region" aria-label="Paragraph tools">
      <div className="para-popup-header">
        <span>Paragraph tools</span>
        <button className="para-popup-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="para-popup-body">
        <div className="para-popup-row">
          <span className="para-popup-label">URL</span>
          <span className="para-popup-value">{url}</span>
          <button
            className={`para-popup-copy-btn${copiedUrl ? ' copied' : ''}`}
            onClick={() => copyText(url, 'url')}
          >
            {copiedUrl ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="para-popup-row">
          <span className="para-popup-label">Citation</span>
          <span className="para-popup-value">{citation}</span>
          <button
            className={`para-popup-copy-btn${copiedCite ? ' copied' : ''}`}
            onClick={() => copyText(citation, 'cite')}
          >
            {copiedCite ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ======== USLM link resolver ========
// Converts USLM identifiers (e.g. /us/pl/106/113, /us/usc/t17/s101) to real
// URLs and handles in-app navigation for US Code cross-references.

// Transform note HTML to replace relative USLM hrefs with absolute external
// URLs.  This makes links work on hover, right-click → open-in-new-tab, and
// middle-click — not just left-click via the event handler.
function resolveNoteLinks(html: string): string {
  return html.replace(
    /href="\/us\/(pl|stat|act)\/([^"]+)"/g,
    (_match, kind: string, rest: string) => {
      if (kind === 'pl') {
        const m = rest.match(/^(\d+)\/(\d+)/);
        if (m) return `href="https://www.govinfo.gov/link/plaw/${m[1]}/public/${m[2]}" target="_blank" rel="noopener noreferrer"`;
      }
      if (kind === 'stat') {
        const m = rest.match(/^(\d+)\/(\d+)/);
        if (m) return `href="https://www.govinfo.gov/link/statute/${m[1]}/${m[2]}" target="_blank" rel="noopener noreferrer"`;
      }
      // Historical acts (/us/act/...) have no reliable external URL.
      // Remove the href so the text is still visible but not a broken link.
      return 'data-ref="unavailable"';
    },
  );
}

function handleUslmClick(
  e: React.MouseEvent,
  onNavigate: (v: ViewState) => void,
) {
  const anchor = (e.target as Element).closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href) return;

  // US Code cross-reference: /us/usc/t17/s801[...]
  const uscMatch = href.match(/^\/us\/usc\/t(\d+[A-Z]*)\/s(\d+[A-Z0-9]*)/i);
  if (uscMatch) {
    e.preventDefault();
    onNavigate({ type: 'section', titleNum: uscMatch[1], sectionNum: uscMatch[2] });
    return;
  }
}

// ======== Notes panel ========

const TOPIC_HEADING: Record<string, string> = {
  historicalAndRevision: 'Historical and Revision Notes',
  amendments: 'Amendments',
  effectiveDateOfAmendment: 'Effective Date of Amendment',
  editorialNotes: 'Editorial Notes',
  statutoryNotes: 'Statutory Notes',
  referencesInText: 'References in Text',
  shortTitleOfAmendment: 'Short Title',
  effectiveDate: 'Effective Date',
  priorProvisions: 'Prior Provisions',
  separability: 'Separability',
  execDoc: 'Executive Document',
  removalDescription: 'Removal Description',
  definitions: 'Definitions',
  savings: 'Savings Provisions',
  constitutionality: 'Constitutionality',
  codification: 'Codification',
  executiveOrder: 'Executive Order',
};

function NotesPanel({
  notes,
  onNavigate,
}: {
  notes: NoteBlock[];
  onNavigate: (v: ViewState) => void;
}) {
  const rendered: { heading: string; isHeader: boolean; html: string }[] = [];
  let pendingHeader = '';

  for (const note of notes) {
    const heading = note.heading || TOPIC_HEADING[note.topic] || '';
    if (!note.html) {
      pendingHeader = heading;
    } else {
      rendered.push({ heading: pendingHeader || heading, isHeader: !!pendingHeader, html: note.html });
      pendingHeader = '';
    }
  }
  if (pendingHeader) {
    rendered.push({ heading: pendingHeader, isHeader: false, html: '' });
  }

  return (
    <div
      className="notes-panel"
      onClick={e => handleUslmClick(e, onNavigate)}
    >
      {rendered.map((item, i) => (
        <div key={i} className="note-section">
          {item.heading && (
            <h3 className={`note-heading${item.isHeader ? ' note-heading-group' : ''}`}>
              {item.heading}
            </h3>
          )}
          {item.html && (
            <div className="note-body" dangerouslySetInnerHTML={{ __html: resolveNoteLinks(item.html) }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ======== Congressional Reports panel (Title 17 only) ========

const REPORT_TYPE_LABELS: Record<string, string> = {
  house: 'House Report',
  senate: 'Senate Report',
  conference: 'Conference Report',
};

const REPORT_TYPE_ABBR: Record<string, string> = {
  house: 'H. Rept.',
  senate: 'S. Rept.',
  conference: 'H. Rept.',
};

function ReportsPanel({ sectionNum }: { sectionNum: string }) {
  const reports = getReportsForSection(sectionNum);

  if (reports.length === 0) {
    return (
      <div className="reports-panel">
        <p className="reports-empty">No congressional reports found for this section.</p>
      </div>
    );
  }

  // Group by public law / act name
  const grouped = new Map<string, CongressionalReport[]>();
  for (const r of reports) {
    const key = r.publicLaw;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <div className="reports-panel">
      <p className="reports-intro">
        The following House and Senate Reports discuss amendments to this section:
      </p>
      {Array.from(grouped.entries()).map(([pl, group]) => (
        <div key={pl} className="reports-group">
          <h3 className="reports-law-heading">
            {group[0].lawName}
            <span className="reports-law-pl">Pub. L. {pl}</span>
          </h3>
          <ul className="reports-list">
            {group.map(r => (
              <li key={`${r.type}-${r.number}`} className="reports-item">
                <span className={`reports-badge reports-badge-${r.type}`}>
                  {REPORT_TYPE_LABELS[r.type]}
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="reports-link"
                >
                  {REPORT_TYPE_ABBR[r.type]} {r.number}
                </a>
                <span className="reports-title">{r.title}</span>
                <span className="reports-year">({r.year})</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ======== Sidebar tree rendering ========

type ViewState =
  | { type: 'home' }
  | { type: 'title'; titleNum: string; nodeAnchor?: string }
  | { type: 'section'; titleNum: string; sectionNum: string; paragraphAnchor?: string };

function renderSidebarItems(
  nodes: Array<TocNode | TocSection>,
  activeSectionNum: string | null,
  titleNum: string,
  onNavigate: (v: ViewState) => void,
  depth: number,
  expandAllCount?: number,
  collapseAllCount?: number,
): React.ReactNode {
  return nodes.map((node, i) => {
    if (isSection(node)) {
      const isActive = activeSectionNum === node.number;
      return (
        <button
          key={node.number}
          className={`sidebar-section-btn${isActive ? ' active' : ''}`}
          style={depth > 0 ? { paddingLeft: `${20 + depth * 10}px` } : undefined}
          onClick={() => onNavigate({ type: 'section', titleNum, sectionNum: node.number })}
        >
          <span className="sidebar-sec-num">{node.numText}</span>
          <span className="sidebar-sec-heading">{node.heading}</span>
        </button>
      );
    }
    return (
      <SidebarNode
        key={node.identifier || `${node.type}-${i}`}
        node={node}
        activeSectionNum={activeSectionNum}
        titleNum={titleNum}
        onNavigate={onNavigate}
        depth={depth}
        expandAllCount={expandAllCount}
        collapseAllCount={collapseAllCount}
      />
    );
  });
}

function SidebarNode({
  node,
  activeSectionNum,
  titleNum,
  onNavigate,
  depth,
  expandAllCount,
  collapseAllCount,
}: {
  node: TocNode;
  activeSectionNum: string | null;
  titleNum: string;
  onNavigate: (v: ViewState) => void;
  depth: number;
  expandAllCount?: number;
  collapseAllCount?: number;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (expandAllCount) setIsCollapsed(false);
  }, [expandAllCount]);

  useEffect(() => {
    if (collapseAllCount) setIsCollapsed(true);
  }, [collapseAllCount]);

  const anchorId = nodeAnchorId(node);
  const nodeClass = node.type === 'chapter'
    ? 'sidebar-chapter'
    : `sidebar-structural sidebar-structural-${node.type}`;
  const headingClass = node.type === 'chapter'
    ? 'sidebar-chapter-heading'
    : `sidebar-structural-heading sidebar-structural-heading-${node.type}`;
  const headingPad = depth > 0 ? { paddingLeft: `${14 + depth * 10}px` } : undefined;

  return (
    <div className={nodeClass}>
      <div className={`${headingClass} sidebar-node-header`} style={headingPad}>
        <button
          className="sidebar-node-navigate-btn"
          onClick={() => onNavigate({ type: 'title', titleNum, nodeAnchor: anchorId })}
          title={`Go to ${nodeShortLabel(node)}`}
        >
          {NODE_TYPE_LABELS[node.type]} {node.number}
          {node.heading ? `: ${node.heading}` : ''}
        </button>
        <button
          className={`sidebar-collapse-toggle${isCollapsed ? ' is-collapsed' : ''}`}
          onClick={() => setIsCollapsed(c => !c)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>
      {!isCollapsed && renderSidebarItems(node.children, activeSectionNum, titleNum, onNavigate, depth + 1, expandAllCount, collapseAllCount)}
    </div>
  );
}

// ======== Sidebar ========

interface SidebarProps {
  view: ViewState;
  onNavigate: (v: ViewState) => void;
  mobileOpen?: boolean;
}

function Sidebar({ view, onNavigate, mobileOpen }: SidebarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandAllCount, setExpandAllCount] = useState(0);
  const [collapseAllCount, setCollapseAllCount] = useState(0);

  // Determine which title is "active" for tree expansion
  const activeTitleNum = view.type !== 'home' ? view.titleNum : null;
  const activeTitle = activeTitleNum
    ? tocData.titles.find(t => t.number === activeTitleNum)
    : null;

  // Clear search when navigating to a different title or back to home
  const prevTitleRef = useRef(activeTitleNum);
  useEffect(() => {
    if (prevTitleRef.current !== activeTitleNum) {
      setQuery('');
      setExpandAllCount(0);
      setCollapseAllCount(0);
      prevTitleRef.current = activeTitleNum;
    }
  }, [activeTitleNum]);

  // Search results — scoped to the active title when viewing one
  type SearchResult =
    | { kind: 'section'; titleNum: string; titleName: string; section: TocSection }
    | { kind: 'node'; titleNum: string; titleName: string; node: TocNode };

  const searchResults = useMemo((): SearchResult[] | null => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    // Normalize citation punctuation: "17 u.s.c. § 512" → "17 usc 512"
    const qCitation = q.replace(/[.§]+/g, '').replace(/\s+/g, ' ').trim();
    const results: SearchResult[] = [];

    const titles = activeTitle ? [activeTitle] : tocData.titles;

    for (const title of titles) {
      const idx = titleSearchIndexes.get(title.number);
      if (!idx) continue;

      // Search hierarchy nodes (chapters, subchapters, etc.)
      for (const node of idx.nodes) {
        if (
          node.heading.toLowerCase().includes(q) ||
          `${NODE_TYPE_LABELS[node.type]} ${node.number}`.toLowerCase().includes(q)
        ) {
          results.push({ kind: 'node', titleNum: title.number, titleName: title.name, node });
          if (results.length >= 60) return results;
        }
      }
      // Search sections
      for (const sec of idx.sections) {
        if (
          sec.heading.toLowerCase().includes(q) ||
          sec.number.toLowerCase().includes(q) ||
          `${title.number} usc ${sec.number}`.includes(qCitation)
        ) {
          results.push({ kind: 'section', titleNum: title.number, titleName: title.name, section: sec });
          if (results.length >= 60) return results;
        }
      }
    }
    return results;
  }, [query, activeTitle]);

  const searchPlaceholder = activeTitle
    ? `Search Title ${activeTitle.number}…`
    : 'Search all titles…';

  return (
    <nav className={`sidebar${mobileOpen ? ' sidebar-mobile-open' : ''}`} aria-label="Navigation">
      <div className="sidebar-search">
        <input
          ref={inputRef}
          type="search"
          className="sidebar-search-input"
          placeholder={searchPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label={searchPlaceholder}
        />
      </div>

      <div className="sidebar-content">
        {searchResults ? (
          // Search results
          <div className="sidebar-search-results">
            {searchResults.length === 0 ? (
              <div className="sidebar-empty">No results</div>
            ) : (
              searchResults.map((r, i) =>
                r.kind === 'node' ? (
                  <button
                    key={`node-${i}`}
                    className="sidebar-search-result sidebar-search-result-node"
                    onClick={() => {
                      onNavigate({ type: 'title', titleNum: r.titleNum, nodeAnchor: nodeAnchorId(r.node) });
                      setQuery('');
                    }}
                  >
                    <span className="result-num">
                      Title {r.titleNum} — {NODE_TYPE_LABELS[r.node.type]} {r.node.number}
                    </span>
                    <span className="result-heading">
                      {highlightText(r.node.heading, query)}
                    </span>
                  </button>
                ) : (
                  <button
                    key={`sec-${i}`}
                    className="sidebar-search-result"
                    onClick={() => {
                      onNavigate({ type: 'section', titleNum: r.titleNum, sectionNum: r.section.number });
                      setQuery('');
                    }}
                  >
                    <span className="result-num">{r.titleNum} U.S.C. § {r.section.number}</span>
                    <span className="result-heading">
                      {highlightText(r.section.heading, query)}
                    </span>
                  </button>
                ),
              )
            )}
          </div>
        ) : activeTitle ? (
          // Title tree: full hierarchy
          <>
            <button
              className="sidebar-back-btn"
              onClick={() => onNavigate({ type: 'home' })}
            >
              ← All Titles
            </button>
            <div className="sidebar-title-label">
              Title {activeTitle.number} — {activeTitle.name}
            </div>
            <div className="sidebar-expand-controls">
              <button
                className="sidebar-expand-btn"
                onClick={() => setExpandAllCount(c => c + 1)}
              >
                Expand All
              </button>
              <button
                className="sidebar-expand-btn"
                onClick={() => setCollapseAllCount(c => c + 1)}
              >
                Collapse All
              </button>
            </div>
            {renderSidebarItems(
              activeTitle.children,
              view.type === 'section' ? view.sectionNum : null,
              activeTitle.number,
              onNavigate,
              0,
              expandAllCount,
              collapseAllCount,
            )}
          </>
        ) : (
          // Title list
          tocData.titles.map(title => (
            <button
              key={title.number}
              className="sidebar-title-btn"
              onClick={() => onNavigate({ type: 'title', titleNum: title.number })}
            >
              <span className="sidebar-title-num">Title {title.number}</span>
              <span className="sidebar-title-name">{title.name}</span>
            </button>
          ))
        )}
      </div>
    </nav>
  );
}

// ======== Breadcrumb ========

function Breadcrumb({
  onNavigate,
  title,
  nodePath,
  section,
}: {
  onNavigate: (v: ViewState) => void;
  title?: TocTitle;
  nodePath?: TocNode[];
  section?: TocSection;
}) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <button className="bc-link" onClick={() => onNavigate({ type: 'home' })}>
        U.S. Code
      </button>
      {title && (
        <>
          <span className="bc-sep">/</span>
          <button
            className="bc-link"
            onClick={() => onNavigate({ type: 'title', titleNum: title.number })}
          >
            Title {title.number}
          </button>
        </>
      )}
      {nodePath && nodePath.map(node => (
        <React.Fragment key={node.identifier || nodeAnchorId(node)}>
          <span className="bc-sep">/</span>
          <button
            className="bc-link"
            onClick={() =>
              title && onNavigate({ type: 'title', titleNum: title.number, nodeAnchor: nodeAnchorId(node) })
            }
          >
            {nodeShortLabel(node)}
          </button>
        </React.Fragment>
      ))}
      {section && (
        <>
          <span className="bc-sep">/</span>
          <span className="bc-current">§ {section.number}</span>
        </>
      )}
    </nav>
  );
}

// ======== Home page (title list) ========

function HomePage({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
  return (
    <div className="home-view">
      <h1 className="home-title">United States Code</h1>
      <p className="home-subtitle">
        {tocData.titles.length} titles · <a href="https://uscode.house.gov/download/download.shtml" target="_blank" rel="noopener noreferrer" className="release-point-link">Release point {tocData.releasePoint}</a> · Updated{' '}
        {tocData.updated}
      </p>
      <div className="title-grid">
        {tocData.titles.map(t => (
          <button
            key={t.number}
            className="title-card"
            onClick={() => onNavigate({ type: 'title', titleNum: t.number })}
          >
            <span className="title-card-num">Title {t.number}</span>
            <span className="title-card-name">{t.name}</span>
            <span className="title-card-meta">
              {t.children.filter(n => !isSection(n)).length} ch · {titleSectionCounts.get(t.number) ?? 0} §§
            </span>
          </button>
        ))}
      </div>
      <p className="home-footer-credit">
        Vibecoded and maintained by <a href="https://www.linkedin.com/in/sy-damle-a420165?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" target="_blank" rel="noopener noreferrer">Sy Damle</a>
      </p>
    </div>
  );
}

// ======== Title page (chapter list) ========

function renderTitleNodes(
  nodes: Array<TocNode | TocSection>,
  titleNum: string,
  onNavigate: (v: ViewState) => void,
  depth: number,
): React.ReactNode {
  return nodes.map((node, i) => {
    if (isSection(node)) {
      const sec = node;
      return (
        <button
          key={sec.number}
          className="chapter-section-btn"
          style={depth > 0 ? { paddingLeft: `${16 + depth * 20}px` } : undefined}
          onClick={() => onNavigate({ type: 'section', titleNum, sectionNum: sec.number })}
        >
          <span className="chapter-sec-num">{sec.numText}</span>
          <span className="chapter-sec-heading">{sec.heading}</span>
        </button>
      );
    }

    const tocNode = node;
    const isChapter = tocNode.type === 'chapter';
    const containerClass = isChapter
      ? 'chapter-card'
      : `toc-structural-card toc-structural-${tocNode.type}`;
    const headingClass = isChapter
      ? 'chapter-card-heading'
      : `toc-structural-heading toc-structural-heading-${tocNode.type}`;
    const childrenClass = isChapter
      ? 'chapter-card-sections'
      : `toc-structural-children toc-structural-children-${tocNode.type}`;

    return (
      <div
        key={tocNode.identifier || `${tocNode.type}-${i}`}
        id={nodeAnchorId(tocNode)}
        className={containerClass}
        style={depth > 0 ? { marginLeft: `${depth * 20}px` } : undefined}
      >
        <div className={headingClass}>
          {NODE_TYPE_LABELS[tocNode.type]} {tocNode.number}
          {tocNode.heading ? ` — ${tocNode.heading}` : ''}
        </div>
        <div className={childrenClass}>
          {renderTitleNodes(tocNode.children, titleNum, onNavigate, depth + 1)}
        </div>
      </div>
    );
  });
}

function TitleView({
  titleNum,
  nodeAnchor,
  onNavigate,
}: {
  titleNum: string;
  nodeAnchor?: string;
  onNavigate: (v: ViewState) => void;
}) {
  useEffect(() => {
    if (!nodeAnchor) return;
    const timer = setTimeout(() => {
      document.getElementById(nodeAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(timer);
  }, [nodeAnchor, titleNum]);

  const title = tocData.titles.find(t => t.number === titleNum);
  if (!title) return <div className="error-msg">Title {titleNum} not found.</div>;

  const totalSections = countSections(title.children);
  const topNodes = title.children.filter(n => !isSection(n)) as TocNode[];

  return (
    <>
      <Breadcrumb onNavigate={onNavigate} title={title} />
      <div className="title-view">
        <div className="title-view-header">
          <div className="title-view-num">Title {title.number}</div>
          <h1 className="title-view-name">{title.name}</h1>
          <p className="title-view-meta">
            {topNodes.length} {topNodes[0]?.type === 'chapter' ? 'chapters' : 'divisions'} · {totalSections} sections
          </p>
        </div>
        {renderTitleNodes(title.children, titleNum, onNavigate, 0)}
      </div>
    </>
  );
}

// ======== Section view ========

function SectionView({
  titleNum,
  sectionNum,
  paragraphAnchor,
  onNavigate,
}: {
  titleNum: string;
  sectionNum: string;
  paragraphAnchor?: string;
  onNavigate: (v: ViewState) => void;
}) {
  const sections = useTitleSections(titleNum);
  const [activePopup, setActivePopup] = useState<PopupState | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'notes' | 'reports'>('text');
  const [activeDefPopup, setActiveDefPopup] = useState<DefPopupState | null>(null);

  useEffect(() => {
    setActivePopup(null);
    setActiveTab('text');
    setActiveDefPopup(null);
  }, [titleNum, sectionNum]);

  const tocTitle = tocData.titles.find(t => t.number === titleNum);
  let tocSection: TocSection | undefined;
  let nodePath: TocNode[] | undefined;
  const allSections = tocTitle ? flattenSections(tocTitle.children) : [];
  const sectionIndex = allSections.findIndex(s => s.number === sectionNum);

  if (tocTitle) {
    tocSection = findSectionInTree(tocTitle.children, sectionNum) ?? undefined;
    nodePath = findPathToSection(tocTitle.children, sectionNum) ?? undefined;
  }

  const prevSection = sectionIndex > 0 ? allSections[sectionIndex - 1] : null;
  const nextSection = sectionIndex < allSections.length - 1 ? allSections[sectionIndex + 1] : null;

  const section: SectionData | undefined =
    sections && sections !== 'error' ? sections[sectionNum] : undefined;

  // Paragraph metadata for structural blocks (all sections except special cases)
  const isSpecialDefs =
    titleNum === '17' && sectionNum === '101';
  const paraMetaMap = useMemo(
    () =>
      section && !isSpecialDefs
        ? buildParaMetaMap(section.content, sectionNum)
        : new Map<number, { path: string; id: string }>(),
    [section, sectionNum, isSpecialDefs],
  );

  // § 101 definitions (Title 17 only)
  const sec101Defs = useMemo(
    () =>
      isSpecialDefs && section
        ? parseSec101Defs(section.content[0]?.html ?? '')
        : [],
    [section, isSpecialDefs],
  );

  // For non-§101 Title 17 sections: parse § 101 defs to power term highlighting
  const isTitle17 = titleNum === '17';
  const defs101 = useMemo(
    () =>
      isTitle17 && !isSpecialDefs && sections && sections !== 'error' && sections['101']
        ? parseSec101Defs(sections['101'].content[0]?.html ?? '')
        : [],
    [sections, isTitle17, isSpecialDefs],
  );

  // For § 115: also parse subsection (e) inline definitions
  const sec115eDefs = useMemo(
    () => isTitle17 && sectionNum === '115' && section ? parseSec115eDefs(section.content) : [],
    [section, sectionNum, isTitle17],
  );

  // Build a single combined annotator (longest-first across both sources)
  const annotateTerms = useMemo(() => {
    if (!isTitle17) return (html: string) => html;
    const termDefs: TermDef[] = [];
    for (const d of defs101) {
      if (d.term && d.slug) termDefs.push({ term: d.term, slug: d.slug, source: '101' });
    }
    for (const d of sec115eDefs) {
      termDefs.push({ term: d.term, slug: d.slug, source: '115e' });
    }
    return buildTermAnnotator(termDefs);
  }, [defs101, sec115eDefs, isTitle17]);

  // Handle clicks on highlighted defined terms (Title 17 only)
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (isTitle17) {
        const span = (e.target as Element).closest('.def-term');
        if (span) {
          const slug = span.getAttribute('data-slug');
          const defSource = span.getAttribute('data-def-source');
          if (slug) {
            if (defSource === '115e') {
              const def = sec115eDefs.find(d => d.slug === slug);
              if (def) {
                setActiveDefPopup({
                  slug,
                  term: def.term,
                  defHtml: getSec115eDefHtml(section!.content, def),
                  label: '\u00a7\u202f115(e)',
                  navTarget: { type: 'section', titleNum: '17', sectionNum: '115', paragraphAnchor: def.anchor },
                  x: e.clientX,
                  y: e.clientY,
                });
                return;
              }
            } else {
              const def = defs101.find(d => d.slug === slug);
              if (def?.term) {
                setActiveDefPopup({
                  slug,
                  term: def.term,
                  defHtml: getFullDefHtml(defs101, slug),
                  label: '\u00a7\u202f101',
                  navTarget: { type: 'section', titleNum: '17', sectionNum: '101', paragraphAnchor: `def/${slug}` },
                  x: e.clientX,
                  y: e.clientY,
                });
                return;
              }
            }
          }
        }
      }
      handleUslmClick(e, onNavigate);
    },
    [isTitle17, defs101, sec115eDefs, section, onNavigate],
  );

  // Scroll to anchor
  useEffect(() => {
    if (!section || !paragraphAnchor) return;
    const id = paragraphAnchor.startsWith('def/')
      ? `def-${sectionNum}-${paragraphAnchor.slice(4)}`
      : `p-${sectionNum}${paragraphAnchor}`;
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [section, sectionNum, paragraphAnchor]);

  if (sections === null) {
    return (
      <>
        <Breadcrumb
          onNavigate={onNavigate}
          title={tocTitle}
          nodePath={nodePath}
          section={tocSection}
        />
        <div className="loading">Loading title {titleNum}…</div>
      </>
    );
  }

  if (sections === 'error') {
    return (
      <>
        <Breadcrumb
          onNavigate={onNavigate}
          title={tocTitle}
          nodePath={nodePath}
          section={tocSection}
        />
        <div className="error-msg">
          Title {titleNum} data is not available yet. Run the parser to generate it.
        </div>
      </>
    );
  }

  if (!section) {
    return (
      <>
        <Breadcrumb
          onNavigate={onNavigate}
          title={tocTitle}
          nodePath={nodePath}
          section={tocSection}
        />
        <div className="error-msg">Section {sectionNum} not found in Title {titleNum}.</div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        onNavigate={onNavigate}
        title={tocTitle}
        nodePath={nodePath}
        section={tocSection}
      />
      {activeDefPopup && (
        <DefTermPopup
          popup={activeDefPopup}
          onClose={() => setActiveDefPopup(null)}
          onNavigate={onNavigate}
        />
      )}
      <div className="section-view">
        {/* Prev / Next nav */}
        <div className="section-nav-bar">
          <div className="section-nav-links">
            <button
              className="nav-btn"
              disabled={!prevSection}
              onClick={() =>
                prevSection &&
                onNavigate({ type: 'section', titleNum, sectionNum: prevSection.number })
              }
              title={prevSection ? `§ ${prevSection.number} — ${prevSection.heading}` : undefined}
            >
              ← Previous
            </button>
            <button
              className="nav-btn"
              disabled={!nextSection}
              onClick={() =>
                nextSection &&
                onNavigate({ type: 'section', titleNum, sectionNum: nextSection.number })
              }
              title={nextSection ? `§ ${nextSection.number} — ${nextSection.heading}` : undefined}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="section-header">
          <div className="section-number-label">{titleNum} U.S.C. § {section.number}</div>
          <h1 className="section-heading">{section.heading || `Section ${section.number}`}</h1>
        </div>

        {/* Tabs */}
        <div className="section-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'text'}
            className={`section-tab${activeTab === 'text' ? ' active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            Text
          </button>
          {section.notes.length > 0 && (
            <button
              role="tab"
              aria-selected={activeTab === 'notes'}
              className={`section-tab${activeTab === 'notes' ? ' active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Notes
            </button>
          )}
          {isTitle17 && getReportsForSection(sectionNum).length > 0 && (
            <button
              role="tab"
              aria-selected={activeTab === 'reports'}
              className={`section-tab${activeTab === 'reports' ? ' active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Congressional Reports
            </button>
          )}
        </div>

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <NotesPanel notes={section.notes} onNavigate={onNavigate} />
        )}

        {/* Congressional Reports tab */}
        {activeTab === 'reports' && isTitle17 && (
          <ReportsPanel sectionNum={sectionNum} />
        )}

        {/* Text tab */}
        <div
          className="statutory-text"
          hidden={activeTab !== 'text'}
          onClick={handleContentClick}
        >
          {section.content.length === 0 ? (
            <p style={{ color: '#767676', fontStyle: 'italic' }}>[Repealed or text omitted]</p>
          ) : isSpecialDefs && sec101Defs.length > 0 ? (
            // Title 17 § 101: definition list
            sec101Defs.map((def, i) => {
              const popupId = `def-${sectionNum}-${def.slug}`;
              const isActive = activePopup?.id === popupId;
              if (def.term && def.slug) {
                const split = splitAtFirstTerm(def.innerHtml, def.term);
                if (split) {
                  const url =
                    `${window.location.origin}${window.location.pathname}` +
                    `#t${titleNum}/s${sectionNum}/def/${def.slug}`;
                  const citation = `${titleNum} U.S.C. § ${sectionNum} "${def.term}"`;
                  return (
                    <React.Fragment key={i}>
                      {isActive && (
                        <ParagraphPopup
                          url={activePopup!.url}
                          citation={activePopup!.citation}
                          onClose={() => setActivePopup(null)}
                        />
                      )}
                      <p className={`sec101-def ${def.indentClass}`} id={popupId}>
                        <span dangerouslySetInnerHTML={{ __html: split.before }} />
                        <button
                          className={`para-num-btn${isActive ? ' active' : ''}`}
                          onClick={() =>
                            isActive
                              ? setActivePopup(null)
                              : setActivePopup({ id: popupId, url, citation })
                          }
                          aria-expanded={isActive}
                          title={`Paragraph tools for \u201c${def.term}\u201d`}
                        >
                          {'\u201c'}{def.term}{'\u201d'}
                        </button>
                        <span dangerouslySetInnerHTML={{ __html: split.after }} />
                      </p>
                    </React.Fragment>
                  );
                }
              }
              return (
                <p
                  key={i}
                  className={`sec101-def ${def.indentClass}`}
                  dangerouslySetInnerHTML={{ __html: def.innerHtml }}
                />
              );
            })
          ) : (
            // All other sections
            section.content.map((block, i) => {
              const indentLevel = Math.min(block.indent, 6);
              const className = [
                'usc-block',
                `usc-indent-${indentLevel}`,
                block.type === 'continuation' ? 'usc-continuation' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const meta = paraMetaMap.get(i);
              if (meta) {
                const split = splitBlockHtml(block.html);
                if (split) {
                  const isActive = activePopup?.id === String(i);
                  const paraUrl =
                    `${window.location.origin}${window.location.pathname}` +
                    `#t${titleNum}/s${sectionNum}${meta.path}`;
                  const citation = `${titleNum} U.S.C. § ${sectionNum}${meta.path}`;
                  return (
                    <React.Fragment key={i}>
                      {isActive && (
                        <ParagraphPopup
                          url={activePopup!.url}
                          citation={activePopup!.citation}
                          onClose={() => setActivePopup(null)}
                        />
                      )}
                      <div className={className} id={meta.id}>
                        <button
                          className={`para-num-btn${isActive ? ' active' : ''}`}
                          onClick={() =>
                            isActive
                              ? setActivePopup(null)
                              : setActivePopup({ id: String(i), url: paraUrl, citation })
                          }
                          aria-expanded={isActive}
                          title={`Paragraph tools for ${meta.path}`}
                        >
                          {split.numText}
                        </button>
                        <span dangerouslySetInnerHTML={{ __html: annotateTerms(split.restHtml) }} />
                      </div>
                    </React.Fragment>
                  );
                }
              }

              return (
                <div
                  key={i}
                  className={className}
                  dangerouslySetInnerHTML={{ __html: annotateTerms(block.html) }}
                />
              );
            })
          )}

          {section.sourceCredit && (
            <div className="source-credit">
              <span className="source-credit-label">Historical and Statutory Notes</span>
              {section.sourceCredit}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ======== URL / Hash routing ========

function parseHash(hash: string): ViewState {
  const h = hash.replace(/^#\/?/, '');
  if (!h) return { type: 'home' };

  // #t17/s101/def/anonymous-work
  const defMatch = h.match(/^t(\d+[A-Z]*)\/s(\d+[A-Z]*)\/def\/(.+)$/);
  if (defMatch) {
    return {
      type: 'section',
      titleNum: defMatch[1],
      sectionNum: defMatch[2],
      paragraphAnchor: `def/${defMatch[3]}`,
    };
  }

  // #t17/s101(a)(1)
  const secParenMatch = h.match(/^t(\d+[A-Z]*)\/s(\d+[A-Z]*)(\(.+)$/);
  if (secParenMatch) {
    return {
      type: 'section',
      titleNum: secParenMatch[1],
      sectionNum: secParenMatch[2],
      paragraphAnchor: secParenMatch[3],
    };
  }

  // #t17/s101
  const secMatch = h.match(/^t(\d+[A-Z]*)\/s(\d+[A-Z]*)$/);
  if (secMatch) {
    return { type: 'section', titleNum: secMatch[1], sectionNum: secMatch[2] };
  }

  // #t17/chapter-1  (title with nodeAnchor)
  const titleAnchorMatch = h.match(/^t(\d+[A-Z]*)\/([a-z]+-[A-Za-z0-9]+)$/);
  if (titleAnchorMatch) {
    return { type: 'title', titleNum: titleAnchorMatch[1], nodeAnchor: titleAnchorMatch[2] };
  }

  // #t17
  const titleMatch = h.match(/^t(\d+[A-Z]*)$/);
  if (titleMatch) {
    return { type: 'title', titleNum: titleMatch[1] };
  }

  return { type: 'home' };
}

function viewToHash(view: ViewState): string {
  if (view.type === 'home') return '#';
  if (view.type === 'title') {
    return view.nodeAnchor
      ? `#t${view.titleNum}/${view.nodeAnchor}`
      : `#t${view.titleNum}`;
  }
  const anchor = view.paragraphAnchor
    ? view.paragraphAnchor.startsWith('def/')
      ? `/${view.paragraphAnchor}`
      : view.paragraphAnchor
    : '';
  return `#t${view.titleNum}/s${view.sectionNum}${anchor}`;
}

// ======== App root ========

export default function App() {
  const [view, setView] = useState<ViewState>(() => parseHash(window.location.hash));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useCallback((v: ViewState) => {
    setView(v);
    setSidebarOpen(false);
    window.history.pushState(null, '', viewToHash(v));
    // Let TitleView's scroll-to-anchor effect handle scrolling when a nodeAnchor is set
    if (!(v.type === 'title' && v.nodeAnchor)) {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const onPop = () => setView(parseHash(window.location.hash));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Prefetch current title's section data in background
  useEffect(() => {
    if (view.type !== 'home') {
      const num = view.titleNum;
      const timer = setTimeout(() => fetchTitle(num), 400);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Dynamic document title
  useEffect(() => {
    if (view.type === 'section') {
      const title = tocData.titles.find(t => t.number === view.titleNum);
      const sec = title ? findSectionInTree(title.children, view.sectionNum) : null;
      document.title = sec
        ? `${view.titleNum} U.S.C. § ${view.sectionNum} – ${sec.heading} | US Code`
        : `${view.titleNum} U.S.C. § ${view.sectionNum} | US Code`;
    } else if (view.type === 'title') {
      const title = tocData.titles.find(t => t.number === view.titleNum);
      document.title = title
        ? `Title ${view.titleNum} – ${title.name} | US Code`
        : `Title ${view.titleNum} | US Code`;
    } else {
      document.title = 'United States Code';
    }
  }, [view]);

  return (
    <div className="app-layout">
      <header className="top-bar">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`hamburger ${sidebarOpen ? 'is-open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>
        <button className="top-bar-logo" onClick={() => navigate({ type: 'home' })}>
          United States Code
        </button>
        <span className="top-bar-maintainer">
          Vibecoded and maintained by <a href="https://www.linkedin.com/in/sy-damle-a420165?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" target="_blank" rel="noopener noreferrer">Sy Damle</a>
        </span>
      </header>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="app-body">
        <Sidebar view={view} onNavigate={navigate} mobileOpen={sidebarOpen} />
        <main className="main-content">
          {view.type === 'home' && <HomePage onNavigate={navigate} />}
          {view.type === 'title' && (
            <TitleView titleNum={view.titleNum} nodeAnchor={view.nodeAnchor} onNavigate={navigate} />
          )}
          {view.type === 'section' && (
            <SectionView
              titleNum={view.titleNum}
              sectionNum={view.sectionNum}
              paragraphAnchor={view.paragraphAnchor}
              onNavigate={navigate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
