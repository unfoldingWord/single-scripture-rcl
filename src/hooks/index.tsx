// @ts-ignore
import * as React from 'react';
import {
  core,
  useRsrc,
  VerseObjects,
  SelectionsContextProvider,
} from 'scripture-resources-rcl';
import {
  ServerConfig, ScriptureReference, ScriptureResource,
} from '../types';

interface Props {
  /** original quote **/
  quote: string|undefined;
  /** original quote's occurrence number **/
  occurrence: number|undefined;
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
  quote,
  config,
  reference,
  occurrence,
  disableWordPopover,
  resource: resource_,
  resourceLink: resourceLink_,
}: Props) {
  const [selections, setSelections] = React.useState([]);

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
  let { verseObjects } = bibleJson || {};
  verseObjects = core.occurrenceInjectVerseObjects(verseObjects);

  if (verseObjects) {
    content = (
      <SelectionsContextProvider
        quote={quote}
        occurrence={occurrence}
        selections={selections}
        verseObjects={verseObjects}
        onSelections={setSelections}
      >
        <VerseObjects verseObjects={verseObjects} disableWordPopover={disableWordPopover} />
      </SelectionsContextProvider>
    );
  }

  return {
    content, title, version, reference, resourceLink,
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
