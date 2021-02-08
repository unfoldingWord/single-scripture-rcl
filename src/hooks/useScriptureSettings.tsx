import { core } from 'scripture-resources-rcl'
import {
  addItemToHistory,
  removeUrl,
} from '../utils/ScriptureVersionHistory'
import { useResourceManifest } from '..'
import { getDefaultSettings, getScriptureObject } from '../utils/ScriptureSettings'
import useScriptureResources from './useScriptureResources'

const KEY_BASE = 'scripturePaneConfig_'

export function useScriptureSettings(props) {
  const {
    cardNum,
    chapter,
    verse,
    bookId,
    resourceId,
    disableWordPopover,
    useLocalStorage,
    isNT,
  } = props

  const key = KEY_BASE + cardNum
  const scriptureResource = getScriptureObject(props) // scripture resource based on default settings
  let [scriptureSettings, setScriptureSettings] = useLocalStorage(key, scriptureResource)

  addItemToHistory(scriptureSettings) // make sure current item persisted in local storage
  const isNewTestament = isNT(bookId)
  const scriptureConfig = useScriptureResources(bookId, scriptureSettings, chapter, verse, isNewTestament)

  const scriptureConfig_ = { ...scriptureConfig }
  scriptureConfig_.content = !!scriptureConfig.content

  const setScripture = (item) => {
    let url

    if (item?.url) {
      try {
        url = new URL(item.url)
      } catch {
        console.error('illegal url', item.url)
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
        scriptureSettings = getDefaultSettings(resourceId, bookId, isNewTestament)
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
