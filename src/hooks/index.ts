// @ts-ignore
import { useEffect, useState } from 'react';
import { useRsrc } from 'scripture-resources-rcl';
import { VerseObjectUtils } from 'word-aligner';
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
  const [content, setContent] = useState(null);
  const options = { usfm: true };
  const { state: { usfm, resource } } = useRsrc({
    config, reference, resourceLink, options,
  });
  const { title } = useResourceManifest(resource);

  useEffect(() => {
    if (usfm && usfm.verseObjects) {
      const verseArray = VerseObjectUtils.getWordsFromVerseObjects(usfm.verseObjects);
      const verse = verseArray.map((o) => o.text).join('');
      setContent(verse);
    }
  }, [usfm]);

  return { content, title };
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