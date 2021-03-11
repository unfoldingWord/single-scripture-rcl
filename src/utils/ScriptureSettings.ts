import {
  addItemToHistory,
  findItemIndexByKey, getItemByTitle,
  getLatest,
  removeItemByIndex,
} from './ScriptureVersionHistory'
import {
  BOOK_NOT_FOUND_ERROR,
  MANIFEST_INVALID_ERROR,
  MANIFEST_NOT_FOUND_ERROR,
  NT_ORIG_LANG,
  NT_ORIG_LANG_BIBLE,
  ORIGINAL_SOURCE,
  OT_ORIG_LANG,
  OT_ORIG_LANG_BIBLE,
  SCRIPTURE_NOT_FOUND_ERROR,
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

export function getRepoUrl(resourceLink: string, server: string): string {
  let repoUrl

  try {
    const [owner, languageId, resourceId] = resourceLink.split('/')
    repoUrl = `${owner}/${languageId}_${resourceId}`
  } catch (e) {
    // resourceLink was invalid
  }

  // @ts-ignore
  return `${server || ''}/${repoUrl}`
}

export function getErrorMessageForResourceLink(resourceLink: string, server: string, errorCode: string): string {
  const repoUrl = getRepoUrl(resourceLink, server)
  const errorMsg = errorCode + repoUrl
  return errorMsg
}

export function validateDcsUrl(url) {
  let validRepoPath = false
  let validUrl = false

  try {
    const parts = url.split('/')
    const [protocol, , host, user, repo] = parts
    validUrl = (protocol === 'https:')
    const hostParts = host ? host.split('.') : []

    if (hostParts.length >= 2) {
      for (let part of hostParts) {
        if (!part) {
          validUrl = false
          break
        }
      }
    } else {
      validUrl = false
    }

    if ( protocol && host && user && repo ) {
      const [languageId, projectId] = repo.split('_')
      validRepoPath = languageId && projectId
    }
  } catch {
    console.log('Invalid DCS URL: ' + url)
  }
  return { validUrl, validRepoPath }
}
/**
 * decode error message into string.  Currently only English
 * @param error - object that contains possible errors that are detected
 * @param server - contains the server being used
 * @param resourceLink - path to repo on server
 * @return empty string if no error, else returns user error message
 */
export function getErrorMessage(error: object, server: string, resourceLink: string) {
  let errorCode = ''

  if (error) {
    console.log(`Resource Error: ${JSON.stringify(error)}`)

    if (error['manifestNotFound']) {
      errorCode = MANIFEST_NOT_FOUND_ERROR
    } else if (error['invalidManifest']) {
      errorCode = MANIFEST_INVALID_ERROR
    } else if (error['contentNotFound']) {
      errorCode = BOOK_NOT_FOUND_ERROR
    } else if (error['scriptureNotLoaded']) {
      errorCode = SCRIPTURE_NOT_FOUND_ERROR
    }
  }
  return errorCode ? getErrorMessageForResourceLink(resourceLink, server, errorCode) : ''
}

