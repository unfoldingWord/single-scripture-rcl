export interface ScriptureReference {
  projectId: string;
  chapter: number;
  verse: number;
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
}

export interface VerseObjectType {
  lemma: string;
  morph: string;
  occurrence: number|string;
  occurrences: number|string;
  strong: string;
  tag: string;
  text: string;
  tw: string;
  type: string;
}

export interface VerseObjectsType {
  [index: number]: VerseObjectType;
}
