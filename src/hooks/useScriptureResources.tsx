import { useScripture } from '..'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'

/**
 * hook to get a scripture resource
 * @param {string} bookId - optional - in case a single verse is expected
 * @param {string} chapter - optional - in case a single verse is expected
 * @param {string} verse - optional - in case a single verse is expected
 * optional query with expected return structure - in case of multiple verses
 * @param {object} bcvQuery - optional - in case of multiple verses
 * @param {object} scriptureSettings - info about the scripture being referenced
 * @param {boolean} isNewTestament
 * @param {string} originalRepoUrl - optional path to repo for original language
 * @param {string} currentLanguageId - optional over-ride for transient case where language in scripture settings have not yet updated
 * @param {string} currentOwner - optional over-ride for transient case where owner in scripture settings have not yet updated
 * @param {object} httpConfig - optional config settings for fetches (timeout, cache, etc.)
 * @param {string} appRef - app default, points to specific ref that could be a branch or tag
 */
export function useScriptureResources({
  bookId = null,
  chapter = null,
  verse = null,
  bcvQuery = null,
  scriptureSettings,
  isNewTestament,
  originalRepoUrl,
  currentLanguageId = null,
  currentOwner = null,
  httpConfig = {},
  appRef = 'master',
}) {
  const scriptureSettings_ = getScriptureResourceSettings(bookId, scriptureSettings, isNewTestament,
    originalRepoUrl, currentLanguageId, currentOwner) // convert any default settings strings

  const scriptureConfig_ = {
    reference: {
      projectId: bookId,
      chapter: chapter,
      verse: verse,
    },
    bcvQuery,
    resource: {
      languageId: scriptureSettings_.languageId,
      projectId: scriptureSettings_.resourceId,
      owner: scriptureSettings_.owner,
      ref: scriptureSettings_.ref || scriptureSettings_.branch || appRef,
    },
    resourceLink: scriptureSettings_.resourceLink,
    config: {
      server: scriptureSettings_.server,
      ...httpConfig,
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
