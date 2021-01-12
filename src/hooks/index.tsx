// @ts-ignore
import * as React from 'react';
import { useRsrc, VerseObjects } from 'scripture-resources-rcl';
import {
  ServerConfig, ScriptureReference, ScriptureResource,
} from '../types';

interface Props {
  reference: ScriptureReference;
  config: ServerConfig;
  resourceLink: string|undefined;
  resource: ScriptureResource|undefined;
}

export function useScripture({
  reference, resourceLink: resourceLink_, config, resource: resource_,
}: Props) {
  let resourceLink = resourceLink_;

  if (resource_) {
    const {
      owner, languageId, projectId, branch = 'master',
    } = resource_ || {};
    resourceLink = `${owner}/${languageId}/${projectId}/${branch}`;
  }

  const options = { getBibleJson: true };
  const { state: { bibleJson, resource } } = useRsrc({
    config, reference, resourceLink, options,
  });
  const { title, version } = useResourceManifest(resource);

  let content: any;
  const { verseObjects } = bibleJson || {};

  if (verseObjects) {
    content = <VerseObjects verseObjects={verseObjects} />;
  }

  return {
    content, title, version, reference,
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
