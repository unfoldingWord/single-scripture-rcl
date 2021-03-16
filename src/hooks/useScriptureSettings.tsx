import { core } from 'scripture-resources-rcl'
import * as isEqual from 'deep-equal'
import {
  addItemToHistory,
  removeItem,
  removeUrl,
} from '../utils/ScriptureVersionHistory'
import {
  INVALID_REPO_URL_ERROR,
  INVALID_URL,
  MANIFEST_INVALID_SHORT_ERROR,
  REPO_NOT_FOUND_ERROR,
  useResourceManifest,
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

export function useScriptureSettings({
  isNewTestament,
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
  useLocalStorage,
  disableWordPopover,
  originalLanguageOwner,
  setUrlError,
}) {
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
  addItemToHistory(scriptureDefaultSettings) // make sure default setting persisted in history
  let [scriptureSettings, setScriptureSettings] = useLocalStorage(KEY_SETTINGS_BASE + cardNum, scriptureDefaultSettings)
  const currentTarget = {
    server,
    owner,
    languageId,
  }
  const [target, setTarget] = useLocalStorage(KEY_TARGET_BASE + cardNum, currentTarget)

  if (!isEqual(currentTarget, target)) { // when target changes, switch back to defaults
    const oldDefaultSettings = { ...scriptureDefaultSettings, ...target }
    oldDefaultSettings.resourceLink = getResourceLink(oldDefaultSettings)
    removeItem(oldDefaultSettings) // remove old default settings from history

    setScriptureSettings(scriptureDefaultSettings)
    setTarget(currentTarget)
  } else {
    addItemToHistory(scriptureSettings) // make sure current setting persisted in history
  }

  const scriptureConfig = useScriptureResources(bookId, scriptureSettings, chapter, verse, isNewTestament)

  const setScripture = (item) => {
    let url

    if (item?.url) {
      setUrlError(null) // clear previous warnings

      try {
        url = new URL(item.url)
      } catch {
        console.log('illegal url', item.url)
        removeUrl(item.url)
        setUrlError(INVALID_URL)
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

        if (resource) {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { title, version } = useResourceManifest(resource)

          if (title && version) {
            // we succeeded in getting resource - use it
            const newScripture = getScriptureObject({
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
            addItemToHistory(newScripture) // persist in local storage
            setScriptureSettings(newScripture)
            error = null // no error
          } else {
            console.error('error parsing manifest', item.url)
            error = MANIFEST_INVALID_SHORT_ERROR
          }
        } else {
          console.error('not found', item.url)
        }
        removeUrl(item.url)

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
      })
    } else { // selected a previous setting
      setUrlError(null) // clear previous warnings
      console.log(`setScripture(${cardNum}) - setScriptureSettings to: ${JSON.stringify(item)}`)
      setScriptureSettings(item)
    }
  }

  return { scriptureConfig, setScripture }
}

export default useScriptureSettings
