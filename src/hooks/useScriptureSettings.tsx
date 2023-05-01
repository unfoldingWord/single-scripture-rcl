import { useEffect, useState } from 'react'
import { core } from 'scripture-resources-rcl'
import * as isEqual from 'deep-equal'
import { KEY_SCRIPTURE_VER_HISTORY, ScriptureVersionHistory } from '../utils/ScriptureVersionHistory'
import {
  INVALID_REPO_URL_ERROR,
  INVALID_URL,
  MANIFEST_INVALID_SHORT_ERROR,
  NT_ORIG_LANG_BIBLE,
  NT_ORIG_LANG,
  ORIGINAL_SOURCE,
  OT_ORIG_LANG_BIBLE,
  OT_ORIG_LANG,
  REPO_NOT_FOUND_ERROR,
  REPO_NOT_SCRIPTURE_ERROR,
  setLocalStorageValue,
  parseResourceManifest,
  validateDcsUrl,
} from '..'
import {
  getResourceLink,
  getScriptureObject,
  getScriptureResourceSettings,
} from '../utils/ScriptureSettings'
import useScriptureResources from './useScriptureResources'

const KEY_SETTINGS_BASE = 'scripturePaneConfig_'
const KEY_TARGET_BASE = 'scripturePaneTarget_'

function fixScriptureSettings(versionHist, scriptureSettings, languageId, cardNum, owner) {
  // clean up hard-coded original sources
  if ((scriptureSettings.resourceId === NT_ORIG_LANG_BIBLE) || (scriptureSettings.resourceId === OT_ORIG_LANG_BIBLE)) {
    if ((scriptureSettings.languageId !== NT_ORIG_LANG) && (scriptureSettings.languageId !== OT_ORIG_LANG)) { // if this is track with current selected language and testament of book
      const newScriptureSettings = { ...scriptureSettings }
      newScriptureSettings.languageId = languageId
      newScriptureSettings.resourceId = ORIGINAL_SOURCE
      newScriptureSettings.owner = owner
      newScriptureSettings.resourceLink = getResourceLink(newScriptureSettings)
      setLocalStorageValue(KEY_SETTINGS_BASE + cardNum, newScriptureSettings)
      versionHist.addItemToHistory(newScriptureSettings)
    }
  }

  // clean history of original sources
  let history = versionHist.getLatest() || []
  let modified = false

  for (let i = 0; i < history.length; i++) { // search for original source duplicates in history
    const item = history[i]
    const resourceId = item.resourceId

    if ((resourceId === NT_ORIG_LANG_BIBLE) || (resourceId === OT_ORIG_LANG_BIBLE) || (resourceId === ORIGINAL_SOURCE)) {
      for ( let j = i + 1; j < history.length; j++) { // search rest of list for duplicates of item at i
        const match_item = history[j]
        const match_resourceId = match_item.resourceId

        if ((match_resourceId === resourceId)) {
          if ((item.owner === match_item.owner) &&
            (item.ref === match_item.ref) &&
            (item.server === match_item.server) &&
            (item.resourceId === match_item.resourceId)) {
            history.splice(j, 1) // remove duplicate item
            modified = true
            j-- // back up index since contents shifted
          }
        }
      }
    }
  }

  if (modified) {
    versionHist.saveHistory(history)
  }
}

function isScriptureResource(subject) {
  const BibleResources = [ 'Bible', 'Aligned Bible', 'Greek New Testament', 'Hebrew Old Testament' ]
  const isScripture = BibleResources.includes(subject)
  return isScripture
}

export function useScriptureSettings({
  isNT,
  title,
  cardNum,
  reference,
  owner,
  server,
  appRef,
  languageId,
  resourceId,
  resourceLink,
  useUserLocalStorage,
  disableWordPopover,
  originalLanguageOwner,
  setUrlError,
  httpConfig,
  greekRepoUrl,
  hebrewRepoUrl,
  wholeBook = false,
  readyForFetch = false,
}) {
  const bookId = reference?.projectId
  const isNewTestament = isNT(bookId)
  const scriptureDefaultSettings = getScriptureObject({
    title,
    server,
    owner,
    ref: appRef,
    languageId,
    resourceId,
    resourceLink,
    disableWordPopover,
    originalLanguageOwner,
  })
  const [versionHistory, saveVersionHist, refreshVersionHist] = useUserLocalStorage(KEY_SCRIPTURE_VER_HISTORY, [])
  const scriptureVersionHist = new ScriptureVersionHistory(versionHistory, saveVersionHist, refreshVersionHist)

  let [scriptureSettings, setScriptureSettings] = useUserLocalStorage(KEY_SETTINGS_BASE + cardNum, scriptureDefaultSettings)
  const currentTarget = {
    server,
    owner,
    languageId,
  }
  const [target, setTarget] = useUserLocalStorage(KEY_TARGET_BASE + cardNum, currentTarget)
  const [cleanUp, setCleanUp] = useState(true)

  useEffect(() => {
    if (languageId && owner) { // make sure we have languageId and owner selected first
      if (cleanUp) { // do initial cleanup
        fixScriptureSettings(scriptureVersionHist, scriptureSettings, languageId, cardNum, owner)
        setCleanUp(false)
      }

      if (!isEqual(currentTarget, target)) { // when target changes, switch back to defaults
        const oldDefaultSettings = { ...scriptureDefaultSettings, ...target }
        oldDefaultSettings.resourceLink = getResourceLink(oldDefaultSettings)
        scriptureVersionHist.removeItem(oldDefaultSettings) // remove old default settings from history
        fixScriptureSettings(scriptureVersionHist, scriptureSettings, languageId, cardNum, owner)

        setScriptureSettings(scriptureDefaultSettings)
        setTarget(currentTarget)
      } else {
        scriptureVersionHist.addItemToHistory(scriptureSettings) // make sure current scripture version persisted in history
      }
    }
  }, [languageId, owner, cleanUp])

  const originalRepoUrl = isNewTestament ? greekRepoUrl : hebrewRepoUrl
  const scriptureConfig = useScriptureResources({
    reference,
    scriptureSettings,
    isNewTestament,
    originalRepoUrl,
    currentLanguageId: languageId,
    currentOwner: owner,
    httpConfig,
    appRef,
    wholeBook,
    readyForFetch,
  })

  /**
   * make sure that bookId or projectId are not embedded in link.
   *    For example in `ru_gl/ru/rsob/master/heb` the projectId heb is in the link and will override the
   *    projectId in the reference when we try to fetch later
   * @param {string} resourceLink
   * @return {string} - cleaned up resource link
   */
  function cleanResourceLink(resourceLink) {
    let resourceLink_ = resourceLink
    const resourceLinks = resourceLink_?.split('/')

    if (resourceLinks?.length > 4) { // if too many fields, then trim
      resourceLink_ = resourceLinks?.slice(0, 4).join('/')
    }
    return resourceLink_
  }

  /**
   * callback to either add new scripture item or select existing item in history
   * @param {object} item - new item to add or existing item to select from history
   * @param {function} validationCB - callback function to pass back if item url was valid or not
   */
  const setScripture = (item, validationCB = null) => {
    let url
    let newUrl = item?.url

    if (newUrl) {
      setUrlError(null) // clear previous warnings

      // handle: `git@git.door43.org:unfoldingWord/en_ult.git`
      //    by mapping to https git fetch url (e.g. https://git.door43.org:unfoldingWord/en_ult.git)
      if (newUrl?.includes('git@')) {
        const parts = newUrl?.split(':')
        const [, hostname] = parts[0].split('@')
        newUrl = `https://${hostname}/${parts.slice(1).join(':')}`
      }

      try {
        url = new URL(newUrl)
      } catch {
        console.log('illegal url', item.url)
        scriptureVersionHist.removeUrl(item.url)
        setUrlError(INVALID_URL)
        validationCB && validationCB(false)
        return
      }
    }

    if (url) {
      setUrlError(null) // clear previous warnings
      let server_
      let hostname = url.hostname

      if (hostname) {
        if (hostname === `door43.org`) {
          // handle case of link to d43 reader page (e.g. https://door43.org/u/unfoldingWord/en_ult/)
          hostname = 'git.' + hostname // redirect to git repo
        }

        if (url.port) {
          hostname += ':' + url.port
        }
        server_ = 'https://' + hostname
      }

      let url_ = newUrl

      if (!url) { // if not a new resource
        scriptureSettings = getScriptureResourceSettings(resourceId, bookId, isNewTestament, originalRepoUrl) // convert any default settings strings
        url_ = scriptureSettings.resourceLink
      }

      // make sure it exists
      core.resourceFromResourceLink({
        resourceLink: url_,
        reference,
        config: {
          server: server_,
          cache: { maxAge: 1 * 60 * 60 * 1000 }, // 1 hr
        },
      }).then(resource => {
        let error = REPO_NOT_FOUND_ERROR
        let newScripture = null

        if (resource) {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const {
            title,
            version,
            subject,
          } = parseResourceManifest(resource)
          const isScripture = isScriptureResource(subject)

          if (!isScripture) {
            console.warn(`useScriptureSettings.setScripture - URL is not a scripture resource: ${url_}`)
            error = REPO_NOT_SCRIPTURE_ERROR
          } else if (title && version) {
            // we succeeded in getting resource - use it
            newScripture = getScriptureObject({
              title,
              server: server_,
              owner: resource.username,
              ref: resource.ref || 'master',
              languageId: resource.languageId,
              resourceId: resource.resourceId,
              resourceLink: cleanResourceLink(resource?.resourceLink),
              disableWordPopover,
              originalLanguageOwner,
            })
            newScripture['userAdded'] = true
            scriptureVersionHist.addItemToHistory(newScripture) // persist in local storage
            setScriptureSettings(newScripture)
            error = null // no error
          } else {
            console.error('error parsing manifest', item.url)
            error = MANIFEST_INVALID_SHORT_ERROR
          }
        } else {
          console.error('not found', item.url)
        }
        scriptureVersionHist.removeUrl(item.url)

        if (error === REPO_NOT_FOUND_ERROR) { // if generic error, validate the URL
          const { validUrl, validRepoPath } = validateDcsUrl(item.url)

          if (!validUrl) {
            error = INVALID_URL
          } else if (validRepoPath) {
            error = REPO_NOT_FOUND_ERROR
          } else {
            error = INVALID_REPO_URL_ERROR
          }
        }
        setUrlError(error)
        validationCB && validationCB(!error, newScripture)
      })
    } else { // selected a previous setting
      setUrlError(null) // clear previous warnings
      setScriptureSettings(item)
      validationCB && validationCB(true)
    }
  }

  return {
    isNewTestament,
    scriptureConfig,
    setScripture,
    scriptureVersionHist,
    scriptureSettings,
  }
}

export default useScriptureSettings
