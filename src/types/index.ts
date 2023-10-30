export interface ScriptureReference {
  projectId: string;
  chapter: number;
  verse: number|string;
}

export interface ServerConfig {
  server: string;
  cache: {
    maxAge: number;
  }
}

export interface ScriptureResource {
  languageId: string;
  projectId: string;
  owner: string;
  branch: string;
  ref: string;
}

// the types of content in the USFM
//   text - raw non-word text to be displayed such as white space, numbers and punctuation
//   word - a single bible word to be displayed
//   paragraph - a paragraph in the bible - //TODO: check if this is this even used anymore
//   milestone - this is a USFM milestone (i.e. a span that contains USFM content such as an alignment)
export type VerseObjectTagType = 'text'|'word'|'paragraph'|'milestone';

export interface VerseObjectType { // parsed representation of USFM content
  children?: VerseObjectType[]; // list of verseObjects that are contained within a milestone. In the case of alignment (USFM tag `zaln`) this would contain the translated words aligned to content field)
  content?: string; // non-displayed content typically for milestones (e.g. in alignments could be used to denote the original language word the children are aligned to)
  endTag? : string; // in the case of a milestone, this contains the string that indicates the end of an alignment
  lemma?: string; // in the case of original languages, this is the root of a word
  morph?: string; // in the case of original languages, this is the morphology of a word (e.g. "Gr,D,,,,,,,,,")
  nextChar?: "\n", // white space that follows this verseObject - typically one or more spaces/newlines
  occurrence?: number|string; // Total occurrences for the word in the verse.
  occurrences?: number|string; // Specific occurrence of the word in the verse.
  strong?: string; //  The text that used for rendering on the screen. (e.g. "G18990")
  tag?: string; // Denotes the USFM tag of the verseObject (see the USFM spec for more information)
  text?: string; //  The text that used for display on the screen.
  tw?: string; // translationWord identifier such as "rc://*/tw/dict/bible/other/biblicaltimeyear"
  type: VerseObjectTagType; // Denotes the category of content the verseObject holds
}

export type VerseObjectsType = VerseObjectType[];

export interface VersesType {
  verseObjects?: VerseObjectsType,
}

export interface ChapterObjectsType {
  [verse: string]: VersesType|string // could be either parsed verse data or raw verse text
}

export interface HeaderType { // parsed USFM content that comes before the first chapter tag
  content: string, // text after the first USFM tag
  tag: string // USFM tag
}

export interface BookObjectsType { // parsed USFM content for a book of the bible
  headers: HeaderType[],
  chapters: { // the chapter content found in the USFM indexed by the chapter identifier
    [chapter: string]: ChapterObjectsType
  }
}

export interface ScriptureConfig {
  reference: ScriptureReference;
  resource: ScriptureResource;
  resourceLink: string;
  config: ServerConfig;
  disableWordPopover?: boolean;
  reloadResource: Function;
  versesForRef: { chapter: string, verse: string, data: object }[];
  fetchResponse: { data: {sha: string} }
}

