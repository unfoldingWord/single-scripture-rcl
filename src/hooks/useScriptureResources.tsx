import { useScripture } from '..'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'

/**
 * hook to get a scripture resource
 * @param {string} bookId
 * @param {object} scriptureSettings - info about the scripture being referenced
 * @param {string} chapter
 * @param {string} verse
 * @param {boolean} isNewTestament
 * @param {string} originalRepoUrl - optional path to repo for original language
 * @param {string} currentLanguageId - optional over-ride for transient case where language in scripture settings have not yet updated
 * @param {string} currentOwner - optional over-ride for transient case where owner in scripture settings have not yet updated
 * @param {number} timeout - optional http timeout in milliseconds for fetching resources, default is 10 sec
 */
export function useScriptureResources(bookId, scriptureSettings, chapter, verse, isNewTestament, originalRepoUrl=null,
                                      currentLanguageId=null, currentOwner=null, timeout=10000) {
  const scriptureSettings_ = getScriptureResourceSettings(bookId, scriptureSettings, isNewTestament,
    originalRepoUrl, currentLanguageId, currentOwner) // convert any default settings strings

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
      cache: { maxAge: 1 * 60 * 60 * 1000 }, // 1 hr
      timeout,
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
