import {
  addItemToHistory,
  findItemIndexByKey, getItemByTitle,
  getLatest,
  removeItemByIndex,
} from './ScriptureVersionHistory'
import {
  NT_ORIG_LANG,
  NT_ORIG_LANG_BIBLE,
  ORIGINAL_SOURCE,
  OT_ORIG_LANG,
  OT_ORIG_LANG_BIBLE,
  TARGET_LITERAL,
  TARGET_SIMPLIFIED,
} from './common'

export const DISABLE_WORD_POPOVER = true // disable word popover for every scripture pane but original languages

export function getResourceLink(scripture) {
  return `${scripture.owner}/${scripture.languageId}/${scripture.resourceId}/${scripture.branch}`
}

export function getScriptureObject({
  title,
  server,
  owner,
  branch,
  languageId,
  resourceId,
  resourceLink,
  disableWordPopover,
  originalLanguageOwner,
}) {
  const scripture = {
    title,
    server,
    owner,
    originalLanguageOwner,
    branch,
    languageId,
    resourceId,
    disableWordPopover,
    resourceLink,
  }

  if (!resourceLink) {
    scripture.resourceLink = getResourceLink({
      owner,
      branch,
      languageId,
      resourceId,
    })
  }
  return scripture
}

export function getScriptureResourceSettings(bookId, scriptureSettings_, isNewTestament) {
  const scriptureSettings = { ...scriptureSettings_ }
  scriptureSettings.disableWordPopover = DISABLE_WORD_POPOVER

  if (scriptureSettings_.resourceId === ORIGINAL_SOURCE) {
    // select original language Bible based on which testament the book belongs
    scriptureSettings.languageId = isNewTestament ? NT_ORIG_LANG : OT_ORIG_LANG
    scriptureSettings.resourceId = isNewTestament
      ? NT_ORIG_LANG_BIBLE
      : OT_ORIG_LANG_BIBLE

    if (scriptureSettings.originalLanguageOwner) {
      scriptureSettings.owner = scriptureSettings.originalLanguageOwner
    }

    scriptureSettings.resourceLink = getResourceLink(scriptureSettings)
    scriptureSettings.disableWordPopover = false
  } else if (scriptureSettings_.resourceId === TARGET_LITERAL) {
    scriptureSettings.resourceId = scriptureSettings.languageId === 'en' ? 'ult' : 'glt'
    scriptureSettings.resourceLink = getResourceLink(scriptureSettings)
  } else if (scriptureSettings_.resourceId === TARGET_SIMPLIFIED) {
    scriptureSettings.resourceId = scriptureSettings.languageId === 'en' ? 'ust' : 'gst'
    scriptureSettings.resourceLink = getResourceLink(scriptureSettings)
  }
  return scriptureSettings
}

export function getScriptureVersionSettings({
  label, resourceLink, setScripture,
}) {
  const history = getLatest()
  let index = findItemIndexByKey(history, 'resourceLink', resourceLink)

  const scriptureSelectorConfig = {
    label, // label for combobox
    options: history,
    current: index,
    allowUserInput: true,
    onChange: (title, index) => {
      if ((index < 0) && title) {
        const newItem = {
          url: title,
          title,
        }
        addItemToHistory(newItem)
      }

      const item = getItemByTitle(title)

      if (item) {
        setScripture(item)
      }
    },
    deleteItem: title => {
      const history = getLatest()
      const deleteIndex = findItemIndexByKey(history, 'title', title)
      removeItemByIndex(deleteIndex)
    },
  }

  return scriptureSelectorConfig
}

/**
 * decode error message into string.  Currently only English
 * @param error - object that contains possible errors that are detected
 * @param config - contains the server being used
 * @param resourceLink - path to repo on server
 * @return empty string if no error, else returns user error message
 */
export function getErrorMessage(error: object, config: object, resourceLink: string) {
  let errorMsg = ''

  if (error) {
    console.log(`Resource Error: ${JSON.stringify(error)}`)
    // @ts-ignore
    const resourceLink_ = `${config?.server || ''}/${resourceLink}`

    if (error['manifestNotFound']) {
      errorMsg = 'This project manifest failed to load.  Please confirm that the correct manifest.yaml file exists in the project at:\n' + resourceLink_
    } else if (error['invalidManifest']) {
      errorMsg = 'The manifest for this project is invalid.  Project is at:\n' + resourceLink_
    } else if (error['contentNotFound']) {
      errorMsg = 'This book can not be found in the project.  Project is at:\n' + resourceLink_
    } else if (error['scriptureNotLoaded']) {
      errorMsg = 'There is no associated content for this verse.  Project is at:\n' + resourceLink_
    }
  }
  return errorMsg
}

