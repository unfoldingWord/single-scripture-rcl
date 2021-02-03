// @ts-ignore
import * as React from 'react';
import { useRsrc, VerseObjects } from 'scripture-resources-rcl';
import {
  ServerConfig, ScriptureReference, ScriptureResource,
} from '../types';
import { useResourceManifest } from './useResourceManifest'

interface Props {
  /** reference for scripture **/
  reference: ScriptureReference;
  /** where to get data **/
  config: ServerConfig;
  /** optional direct path to bible resource, in format ${owner}/${languageId}/${projectId}/${branch} **/
  resourceLink: string|undefined;
  /** optional resource object to use to build resourceLink **/
  resource: ScriptureResource|undefined;
  /** if true then do not display lexicon popover on hover **/
  disableWordPopover: boolean|undefined;
}

export function useScripture({
  reference, resourceLink: resourceLink_, config,
  resource: resource_, disableWordPopover,
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
    content = <VerseObjects verseObjects={verseObjects} disableWordPopover={disableWordPopover} />;
  }

  return {
    content, title, version, reference, resourceLink,
  };
}
