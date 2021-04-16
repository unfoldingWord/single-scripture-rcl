import {
  BOOK_NOT_FOUND_ERROR,
  LOADING_RESOURCE,
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

/**
 * return true if resource is an original language bible
 * @param resourceId
 */
export function isOriginalBible(resourceId) {
  const isOrig = ((resourceId === NT_ORIG_LANG_BIBLE) || (resourceId === OT_ORIG_LANG_BIBLE) || (resourceId === ORIGINAL_SOURCE))
  return isOrig
}

export function getScriptureResourceSettings(bookId, scriptureSettings_, isNewTestament) {
  const scriptureSettings = { ...scriptureSettings_ }
  scriptureSettings.disableWordPopover = DISABLE_WORD_POPOVER
  const resourceId = scriptureSettings_.resourceId

  if ((resourceId === ORIGINAL_SOURCE) || (resourceId === NT_ORIG_LANG_BIBLE) || (resourceId === OT_ORIG_LANG_BIBLE)) {
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
  } else if (resourceId === TARGET_LITERAL) {
    scriptureSettings.resourceId = scriptureSettings.languageId === 'en' ? 'ult' : 'glt'
    scriptureSettings.resourceLink = getResourceLink(scriptureSettings)
  } else if (resourceId === TARGET_SIMPLIFIED) {
    scriptureSettings.resourceId = scriptureSettings.languageId === 'en' ? 'ust' : 'gst'
    scriptureSettings.resourceLink = getResourceLink(scriptureSettings)
  }
  return scriptureSettings
}

export function getScriptureVersionSettings({
  label,
  resourceLink,
  setScripture,
  scriptureVersionHist,
}) {
  const history = scriptureVersionHist.getLatest()
  let index = scriptureVersionHist.findItemIndexByKey(history, 'resourceLink', resourceLink)

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
        scriptureVersionHist.addItemToHistory(newItem)
      }

      const item = scriptureVersionHist.getItemByTitle(title)

      if (item) {
        setScripture(item)
      }
    },
    deleteItem: title => {
      const history = scriptureVersionHist.getLatest()
      const deleteIndex = scriptureVersionHist.findItemIndexByKey(history, 'title', title)
      scriptureVersionHist.removeItemByIndex(deleteIndex)
    },
  }

  return scriptureSelectorConfig
}

export function getRepoUrl(resourceLink: string, server: string, isNT: boolean): string {
  let repoUrl

  try {
    let [owner, languageId, resourceId] = resourceLink.split('/')

    switch (resourceId) {
    case ORIGINAL_SOURCE:
      languageId = isNT ? NT_ORIG_LANG : OT_ORIG_LANG
      resourceId = isNT
        ? NT_ORIG_LANG_BIBLE
        : OT_ORIG_LANG_BIBLE
      break

    case TARGET_LITERAL:
      resourceId = (languageId === 'en') ? 'ult' : 'glt'
      break

    case TARGET_SIMPLIFIED:
      resourceId = (languageId === 'en') ? 'ust' : 'gst'
      break
    }
    repoUrl = `${owner}/${languageId}_${resourceId}`
  } catch (e) {
    // resourceLink was invalid
  }

  // @ts-ignore
  return `${server || ''}/${repoUrl}`
}

export function getErrorMessageForResourceLink(
  resourceLink: string,
  server: string,
  errorCode: string,
  isNT: boolean): string
{
  const repoUrl = getRepoUrl(resourceLink, server, isNT)
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
 * decode resource status into string.  Currently only English
 * @param resourceStatus - object that contains state and errors that are detected
 * @param server - contains the server being used
 * @param resourceLink - path to repo on server
 * @param isNT - true if NT book
 * @return empty string if no error, else returns user error message
 */
export function getResourceMessage(resourceStatus: object, server: string, resourceLink: string, isNT: boolean) {
  let messageKey = ''

  if (resourceStatus['loading']) {
    messageKey = LOADING_RESOURCE
  } else {
    if (resourceStatus['manifestNotFoundError']) {
      messageKey = MANIFEST_NOT_FOUND_ERROR
    } else if (resourceStatus['invalidManifestError']) {
      messageKey = MANIFEST_INVALID_ERROR
    } else if (resourceStatus['contentNotFoundError']) {
      messageKey = BOOK_NOT_FOUND_ERROR
    } else if (resourceStatus['scriptureNotLoadedError']) {
      messageKey = SCRIPTURE_NOT_FOUND_ERROR
    }

    if (messageKey) {
      console.log(`getResourceMessage(${resourceLink}) - Resource Error: ${JSON.stringify(resourceStatus)}`)
      messageKey = getErrorMessageForResourceLink(resourceLink, server, messageKey, isNT)
    }
  }
  return messageKey
}

