// @ts-ignore
import * as React from 'react';
import { useRsrc, VerseObjects } from 'scripture-resources-rcl';
import { ServerConfig } from '../types';

interface ScriptureReference {
  chapter: number;
  verse: number;
}

interface Props {
  reference: ScriptureReference;
  config: ServerConfig;
  resourceLink: string;
}

export function useScripture({
  reference, resourceLink, config,
}: Props) {
  const options = { usfm: true };
  const { state: { usfm, resource } } = useRsrc({
    config, reference, resourceLink, options,
  });
  const { title, version } = useResourceManifest(resource);

  let content: any;
  const { verseObjects } = usfm || {};

  if (verseObjects) {
    content = <VerseObjects verseObjects={verseObjects} />;
  }

  return {
    content, title, version,
  };
}

export function useResourceManifest(resource){
  if (resource && resource.manifest){
    const {
      manifest: {
        dublin_core: {
          title, version, rights,
        },
      },
    } = resource;
    return {
      title, version, rights,
    };
  } else {
    return {};
  }
}