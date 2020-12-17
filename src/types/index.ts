export interface ScriptureReference {
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