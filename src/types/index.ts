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