import { core } from 'scripture-resources-rcl'
import * as isEqual from 'deep-equal'
import {
  addItemToHistory,
  removeItem,
  removeUrl,
} from '../utils/ScriptureVersionHistory'
import { useResourceManifest } from '..'
import {
  getResourceLink,
  getScriptureObject,
  getScriptureResourceSettings,
} from '../utils/ScriptureSettings'
import useScriptureResources from './useScriptureResources'

const KEY_SETTINGS_BASE = 'scripturePaneConfig_'
const KEY_TARGET_BASE = 'scripturePaneTarget_'

export function useScriptureSettings(props) {
  const {
    cardNum,
    chapter,
    verse,
    bookId,
    owner,
    server,
    languageId,
    resourceId,
    disableWordPopover,
    useLocalStorage,
    isNT,
  } = props

  const isNewTestament = isNT(bookId)
  const scriptureDefaultSettings = getScriptureObject(props)
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

  const scriptureConfig_ = { ...scriptureConfig }
  scriptureConfig_.content = !!scriptureConfig.content

  const setScripture = (item) => {
    let url

    if (item?.url) {
      try {
        url = new URL(item.url)
      } catch {
        console.log('illegal url', item.url)
        removeUrl(item.url)
        return
      }
    }

    if (url) {
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
            })
            newScripture['userAdded'] = true
            addItemToHistory(newScripture) // persist in local storage
            setScriptureSettings(newScripture)
          } else {
            console.error('error passing manifest', item.url)
          }
        } else {
          console.error('not found', item.url)
        }
        removeUrl(item.url)
      })
    } else { // selected a previous setting
      console.log(`setScripture(${cardNum}) - setScriptureSettings to: ${JSON.stringify(item)}`)
      setScriptureSettings(item)
    }
  }

  return { scriptureConfig, setScripture }
}

export default useScriptureSettings
