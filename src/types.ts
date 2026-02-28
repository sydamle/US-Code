export interface TocSection {
  number: string;
  numText: string;
  heading: string;
  identifier: string;
}

export type TocNodeType =
  | 'subtitle'
  | 'part'
  | 'subpart'
  | 'chapter'
  | 'subchapter'
  | 'division'
  | 'subdivision';

export interface TocNode {
  type: TocNodeType;
  number: string;
  heading: string;
  identifier: string;
  children: Array<TocNode | TocSection>;
}

export interface TocTitle {
  number: string;
  name: string;
  identifier: string;
  children: Array<TocNode | TocSection>;
}

export interface TocData {
  releasePoint: string;
  updated: string;
  titles: TocTitle[];
}

export interface ContentBlock {
  type: string;
  indent: number;
  html: string;
}

export interface NoteBlock {
  topic: string;
  heading: string;
  html: string;
}

export interface SectionData {
  number: string;
  numText: string;
  heading: string;
  identifier: string;
  content: ContentBlock[];
  sourceCredit: string;
  notes: NoteBlock[];
}

export interface SectionsMap {
  [key: string]: SectionData;
}
