export interface ScriptureReferenceType {
  bookId: string;
  chapter: number;
  verse: number|string;
}

export interface ServerConfigType {
  server: string;
  cache: {
    maxAge: number;
  }
}

export interface ScriptureResourceType {
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

export interface VerseReferenceType {
  verseData: VersesType
}

export type VerseReferencesType = VerseReferenceType[];

export interface ChapterObjectsType {
  [verse: string]: VersesType|string // could be either parsed verse data or raw verse text
}

export interface HeaderType { // parsed USFM content that comes before the first chapter tag
  content: string, // text after the first USFM tag
  tag: string // USFM tag
}

export interface BookObjectsType { // parsed USFM content for a book of the bible
  bookId?: string; // short form identifier for book of the bible such as `mrk`
  chapters: { // the chapter content found in the USFM indexed by the chapter identifier
    [chapter: string]: ChapterObjectsType
  },
  headers: HeaderType[],
  languageId?: string // short form identifier for language of the book such as `en`
}

export interface ScriptureConfig {
  reference: ScriptureReferenceType;
  resource: ScriptureResourceType;
  resourceLink: string;
  config: ServerConfigType;
  disableWordPopover?: boolean;
  reloadResource: Function;
  versesForRef: { chapter: string, verse: string, data: object }[];
  fetchResponse: { data: {sha: string} }
}

export interface BookFetchParams {
  config: {} | ServerConfigType;
  // TODO: document all the formats supported in
  // see parseResourceLink in scripture-resources-rcl for other formats supported,
  // but most common is <owner>/<language>/<resourceId>/<branch>/<bookId> (e.g. ru_gl/ru/rlob/master/tit)
  resourceLink?: string;
  // parameters used to generate resourceLink if it's not present
  resource?: ScriptureResourceType;
  reference?: ScriptureReferenceType;
}

export interface StartEdit {
  (): Promise<string>;
}

export type LanguageType = {
  languageId: string, // short language code such as "en"
  direction: string, // language direction "ltr" or "rtl"
};

export interface AlignerDataType {
  wordBank?: Object[], // list of wordbank word (target language words) in format needed by word-aligner-rcl
  alignments?: Object[], // list of word alignments in format needed by word-aligner-rcl
  errorMessage?: string, // if present then we don't have necessary data to do alignment
}

export interface AlignerResultsDataType {
  targetWords?: Object[], // list of target language words in format used in word-aligner-rcl
  verseAlignments?: Object[], // list of word alignments in format used by word-aligner-rcl
}

export interface ScriptureALignmentEditProps {
  // index to use for book (e.g. `01` for `GEN`)
  bookIndex: string,
  // current verse selected from initialVerseObjects[]
  currentIndex: number,
  // reference for verse selected for alignment
  currentVerseRef: ScriptureReferenceType,
  // if true then editing is allowed
  enableEdit: boolean,
  // if true then alignment is allowed
  enableAlignment: boolean,
  // configuration to use for http communication
  httpConfig: ServerConfigType,
  // array of the initial verseObjects for current reference
  initialVerseObjects: VerseObjectsType,
  // initial text for verse
  initialVerseText: string,
  // flag that we are working on NT book
  isNewTestament: boolean,
  // user name of logged in user
  loggedInUser: string,
  // owner to use when fetching original language resources
  originalLanguageOwner: string,
  // url for the original language repo
  originalRepoUrl: string,
  // original scripture bookObjects for current book
  originalScriptureBookObjects: BookObjectsType,
  /** current reference **/
  reference: ScriptureReferenceType;
  // details about the current scripture loaded
  scriptureConfig: ScriptureConfig,
  // settings to be used for scripture
  scriptureSettings: { },
  // callback to save current verse edit and alignment changes
  setSavedChanges: Function,
  // source language code such as `hbo`
  sourceLanguage: string,
  // callback to create a user branch for saving edit data
  startEditBranch: StartEdit,
  // current target language
  targetLanguage: LanguageType,
  // title to show in alignment
  title: string,
  // branch name currently being used (e.g. `master` or user branch)
  workingResourceBranch: string,
}
