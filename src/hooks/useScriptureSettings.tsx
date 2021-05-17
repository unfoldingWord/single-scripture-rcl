import { useEffect, useState } from 'react'
import { core } from 'scripture-resources-rcl'
import * as isEqual from 'deep-equal'
import { KEY_SCRIPTURE_VER_HISTORY, ScriptureVersionHistory } from '../utils/ScriptureVersionHistory'
import {
  INVALID_REPO_URL_ERROR,
  INVALID_URL,
  MANIFEST_INVALID_SHORT_ERROR,
  NT_ORIG_LANG_BIBLE,
  ORIGINAL_SOURCE,
  OT_ORIG_LANG_BIBLE,
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
    const newScriptureSettings = { ...scriptureSettings }
    newScriptureSettings.languageId = languageId
    newScriptureSettings.resourceId = ORIGINAL_SOURCE
    newScriptureSettings.owner = owner
    newScriptureSettings.resourceLink = getResourceLink(newScriptureSettings)
    setLocalStorageValue(KEY_SETTINGS_BASE + cardNum, newScriptureSettings)
    versionHist.addItemToHistory(newScriptureSettings)
  }

  // clean history of original sources
  let history = versionHist.getLatest() || []
  let first = -1
  let modified = false

  for (let i = 0; i < history.length; i++) { // search for original source duplicates in history
    const item = history[i]
    const resourceId = item.resourceId

    if ((resourceId === NT_ORIG_LANG_BIBLE) || (resourceId === OT_ORIG_LANG_BIBLE) || (resourceId === ORIGINAL_SOURCE)) {
      if (first < 0) {
        first = i
      } else { // found duplicate
        history.splice(i, 1) // remove duplicate item
        modified = true
        i--
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
  chapter,
  verse,
  bookId,
  owner,
  server,
  branch,
  languageId,
  resourceId,
  resourceLink,
  useUserLocalStorage,
  disableWordPopover,
  originalLanguageOwner,
  setUrlError,
}) {
  const isNewTestament = isNT(bookId)
  const scriptureDefaultSettings = getScriptureObject({
    title,
    server,
    owner,
    branch,
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

  const scriptureConfig = useScriptureResources(bookId, languageId, owner, scriptureSettings, chapter, verse, isNewTestament)

  const setScripture = (item, validationCB = null) => {
    let url

    if (item?.url) {
      setUrlError(null) // clear previous warnings

      try {
        url = new URL(item.url)
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
        if (url.port) {
          hostname += ':' + url.port
        }
        server_ = 'https://' + hostname
      }

      let url_ = item.url

      if (!url) { // if not a new resource
        scriptureSettings = getScriptureResourceSettings(resourceId, bookId, isNewTestament) // convert any default settings strings
        url_ = scriptureSettings.resourceLink
      }

      // make sure it exists
      core.resourceFromResourceLink({
        resourceLink: url_,
        reference: {
          projectId: bookId,
          chapter: chapter,
          verse: verse,
        },
        config: {
          server: server_,
          cache: { maxAge: 60 * 1000 },
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
              branch: resource.tag,
              languageId: resource.languageId,
              resourceId: resource.resourceId,
              resourceLink: resource.resourceLink,
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
    scriptureConfig,
    setScripture,
    scriptureVersionHist,
  }
}

export default useScriptureSettings
