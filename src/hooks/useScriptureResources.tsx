import { useScripture } from '..'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'

export function useScriptureResources(bookId, languageId, owner, scriptureSettings, chapter, verse, isNewTestament) {
  const scriptureSettings_ = getScriptureResourceSettings(bookId, scriptureSettings, isNewTestament, languageId, owner) // convert any default settings strings

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
    resourceLink: scriptureSettings_.resourceLink,
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
