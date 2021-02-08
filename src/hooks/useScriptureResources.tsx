import { useScripture } from '..'
import { getDefaultSettings } from '../utils/ScriptureSettings'

export function useScriptureResources(bookId, scriptureSettings, chapter, verse, isNewTestament) {
  const scriptureSettings_ = getDefaultSettings(bookId, scriptureSettings, isNewTestament)

  const scriptureConfig_ = {
    reference: {
      projectId: bookId,
      chapter: chapter,
      verse: verse,
    },
    resource: {
      languageId: scriptureSettings_.languageId,
      projectId: scriptureSettings_.resourceId,
      owner: scriptureSettings_.owner,
      branch: scriptureSettings_.branch,
    },
    config: {
      server: scriptureSettings_.server,
      cache: { maxAge: 60 * 1000 },
    },
    disableWordPopover: scriptureSettings_.disableWordPopover,
  }

  // @ts-ignore
  const scriptureResource = useScripture(scriptureConfig_)

  // restore any default settings
  scriptureResource.resourceLink = scriptureSettings.resourceLink

  if (!scriptureResource['resource']) { // keep resource if not returned
    scriptureResource['resource'] = scriptureConfig_.resource
  }
  return scriptureResource
}

export default useScriptureResources
