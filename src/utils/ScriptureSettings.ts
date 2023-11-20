import {
  CONTENT_NOT_FOUND_ERROR,
  INVALID_MANIFEST_ERROR,
  LOADING_STATE,
  MANIFEST_NOT_LOADED_ERROR,
  SCRIPTURE_NOT_LOADED_ERROR,
} from 'translation-helps-rcl'
import { core } from 'scripture-resources-rcl'
import usfmjs from 'usfm-js'
import {
  BookFetchParams,
  ScriptureReference,
  ScriptureResource,
  ServerConfig,
  VerseObjectsType,
} from '../types'
import {
  BOOK_NOT_FOUND_ERROR_MSG,
  LOADING_RESOURCE,
  MANIFEST_INVALID_ERROR_MSG,
  MANIFEST_NOT_FOUND_ERROR_MSG,
  NT_ORIG_LANG,
  NT_ORIG_LANG_BIBLE,
  ORIGINAL_SOURCE,
  OT_ORIG_LANG,
  OT_ORIG_LANG_BIBLE,
  SCRIPTURE_NOT_FOUND_ERROR_MSG,
  TARGET_LITERAL,
  TARGET_SIMPLIFIED,
} from './common'
import { delay } from './delay'

export const DISABLE_WORD_POPOVER = true // disable word popover for every scripture pane but original languages

export function getResourceLink(scripture) {
  const ref = scripture.ref || scripture.branch
  return `${scripture.owner}/${scripture.languageId}/${scripture.resourceId}/${ref}`
}

export function parseResourceLink(resourceLink) {
  const [owner, languageId, resourceId, ref] = resourceLink.split('/')
  return {
    owner,
    languageId,
    resourceId,
    ref,
  }
}

export function getScriptureObject({
  title,
  server,
  owner,
  ref,
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
    ref,
    languageId,
    resourceId,
    disableWordPopover,
    resourceLink,
  }

  if (!resourceLink) {
    scripture.resourceLink = getResourceLink({
      owner,
      ref,
      languageId,
      resourceId,
    })
  }
  return scripture
}

/**
 * return verse data given a scripture config and verse number
 * @param scriptureConfig
 * @param verseNum
 */
export function getVerseDataFromScripConfig(scriptureConfig, verseNum) {
  return scriptureConfig?.versesForRef?.find(
    verseRef => verseRef.verse === verseNum
  )
}

/**
 * return true if resource is an original language bible
 * @param resourceId
 */
export function isOriginalBible(resourceId) {
  const isOrig = ((resourceId === NT_ORIG_LANG_BIBLE) || (resourceId === OT_ORIG_LANG_BIBLE) || (resourceId === ORIGINAL_SOURCE))
  return isOrig
}

/**
 * make sure scriptureSettings are up to date with current owner and language
 * @param {object} scriptureSettings
 * @param {string} currentOwner - optional over-ride for transient case where owner in scripture settings have not yet updated
 * @param {string} currentLanguageId - optional over-ride for transient case where language in scripture settings have not yet updated
 */
export function cleanupAccountSettings(scriptureSettings: any, currentOwner: any, currentLanguageId: any) {
  if (currentOwner && (currentOwner !== scriptureSettings.owner)) { // if owner changed, update scriptureSettings
    scriptureSettings.owner = currentOwner
  }

  if (currentLanguageId && (currentLanguageId !== scriptureSettings.languageId)) { // if language changed, update scriptureSettings
    scriptureSettings.languageId = currentLanguageId
  }
}

/**
 * separate URL into server and resource link
 * @param {string} originalRepoUrl
 */
export function splitUrl(originalRepoUrl) {
  if (originalRepoUrl) {
    const url = new URL(originalRepoUrl)
    const server = url.origin
    const resourceLink = url.pathname + (url.search || '')
    return { server, resourceLink }
  }
  return {}
}

/**
 * get the scripture settings needed for fetch - for OrigLang, ULT, GLT will replace owner and languageId with correct values
 * @param {string} bookId
 * @param {object} scriptureSettings_
 * @param {boolean} isNewTestament
 * @param {string} originalRepoUrl - optional path to repo for original language
 * @param {string} currentLanguageId - optional over-ride for transient case where language in scripture settings have not yet updated
 * @param {string} currentOwner - optional over-ride for transient case where owner in scripture settings have not yet updated
 */
export function getScriptureResourceSettings(
  bookId, scriptureSettings_, isNewTestament,
  originalRepoUrl=null,
  currentLanguageId=null,
  currentOwner=null,
) {
  const scriptureSettings = { ...scriptureSettings_ }
  scriptureSettings.disableWordPopover = DISABLE_WORD_POPOVER
  const resourceId = scriptureSettings_.resourceId

  if (resourceId === ORIGINAL_SOURCE) {
    // select original language Bible based on which testament the book belongs
    scriptureSettings.languageId = isNewTestament ? NT_ORIG_LANG : OT_ORIG_LANG
    scriptureSettings.resourceId = isNewTestament
      ? NT_ORIG_LANG_BIBLE
      : OT_ORIG_LANG_BIBLE

    if (scriptureSettings.originalLanguageOwner) {
      scriptureSettings.owner = scriptureSettings.originalLanguageOwner
    }

    if (originalRepoUrl) { // use this url if defined
      const { server, resourceLink } = splitUrl(originalRepoUrl)
      scriptureSettings.server = server
      scriptureSettings.resourceLink = resourceLink
    } else { // fall back to app defaults
      scriptureSettings.resourceLink = getResourceLink(scriptureSettings)
    }
    scriptureSettings.disableWordPopover = false
  } else if (resourceId === TARGET_LITERAL) {
    cleanupAccountSettings(scriptureSettings, currentOwner, currentLanguageId)
    scriptureSettings.resourceId = scriptureSettings.languageId === 'en' ? 'ult' : 'glt'
    scriptureSettings.resourceLink = getResourceLink(scriptureSettings)
  } else if (resourceId === TARGET_SIMPLIFIED) {
    cleanupAccountSettings(scriptureSettings, currentOwner, currentLanguageId)
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
    onChange: (title, index, validationCB=null) => {
      let item

      if ((index < 0) && title) {
        const newItem = {
          url: title,
          title,
        }
        const index = scriptureVersionHist.addItemToHistory(newItem)

        if (index >= 0) {
          item = scriptureVersionHist.getLatest()[index]
        }
      } else {
        item = scriptureVersionHist.getItemByTitle(title)
      }

      if (item) {
        setScripture(item, validationCB)
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

export function getResourceErrorMessage(resourceStatus: object) {
  let message = ''

  if (resourceStatus[MANIFEST_NOT_LOADED_ERROR]) {
    message = MANIFEST_NOT_FOUND_ERROR_MSG
  } else if (resourceStatus[INVALID_MANIFEST_ERROR]) {
    message = MANIFEST_INVALID_ERROR_MSG
  } else if (resourceStatus[CONTENT_NOT_FOUND_ERROR]) {
    message = BOOK_NOT_FOUND_ERROR_MSG
  } else if (resourceStatus[SCRIPTURE_NOT_LOADED_ERROR]) {
    message = SCRIPTURE_NOT_FOUND_ERROR_MSG
  }
  return message
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
  let message = ''

  if (resourceStatus[LOADING_STATE]) {
    message = LOADING_RESOURCE
  } else {
    message = getResourceErrorMessage(resourceStatus)

    if (message) {
      message = getErrorMessageForResourceLink(resourceLink, server, message, isNT)
    }
  }
  return message
}

/**
 * generate resource string
 * @param owner
 * @param languageId
 * @param projectId
 * @param ref
 */
export function getResourceLinkSpecific(owner: string, languageId: string, projectId: string, ref: string) {
  return `api/v1/repos/${owner}/${languageId}_${projectId}/contents?ref=${ref}`
}

export function fixOccurrence(occurrence) {
  if (typeof occurrence === 'string') {
    return parseInt(occurrence)
  }
  return occurrence
}

export function cleanupVerseObjects(verseObjects) {
  if (verseObjects?.length) {
    const verseObjects_ = [...verseObjects]

    for (let i = 0, l = verseObjects_.length; i < l; i++) {
      const vo = verseObjects_[i]

      if (vo.type === 'word' && (vo.occurrence || vo.occurrences)) {
        const word = { ...vo }

        if (vo.occurrence) {
          word.occurrence = fixOccurrence(vo.occurrence)
        }

        if (vo.occurrences) {
          word.occurrences = fixOccurrence(vo.occurrences)
        }
        verseObjects_[i] = word
      } else if (vo.children) {
        const children = cleanupVerseObjects(vo.children)
        const newVo = {
          ...vo,
          children,
        }
        verseObjects_[i] = newVo
      }
    }
    return verseObjects_
  }
  return []
}

/**
 * take the filename of the book (e.g. "57-TIT.usfm") and parse out the bookId
 * @param {string} filename
 * @return {string} bookId if found
 */
export function getBookNameFromUsfmFileName(filename) {
  const regex = /^(.*?)\.usfm/
  const bookName = filename?.match(regex)?.[1]
  return bookName
}

/**
 * parse the USFM to find bookID in header
 * @param {string} bibleUsfm
 * @return {string} bookId if found
 */
export function getBibleIdFromUsfmContentID(bibleUsfm) {
  const idHeader = '\\id '
  const posId = bibleUsfm?.indexOf(idHeader)

  if (posId >= 0) {
    const idStart = posId + idHeader.length
    let headerId = bibleUsfm?.substring( idStart, idStart + 100).trim()
    let headerBookID = null

    if (headerId?.length > 1) {
      headerBookID = headerId?.split(' ')
      headerBookID = headerBookID?.[0].trim()
    }
    return headerBookID
  }
  return null
}

/**
 * determines if there are any words in verseObjects
 * @param {VerseObjectsType} verseObjects - array of verseObjects to search for words
 * @return {boolean} true if word is found
 */
export function verseObjectsHaveWords(verseObjects: VerseObjectsType) {
  if (verseObjects?.length) {
    for (const vo of verseObjects) {
      if (vo.type === 'word') {
        return true
      } else if (vo.children) {
        const foundWords = verseObjectsHaveWords(vo.children)

        if (foundWords) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * extract just the alignments from verseObjects
 * @param {VerseObjectsType} verseObjects
 * @returns {VerseObjectsType} - just alignments
 */
export function getAlignments(verseObjects: VerseObjectsType):VerseObjectsType {
  const alignmentsList = verseObjects.filter(vo => vo.tag === 'zaln')

  // remove endTag
  for (let i = 0; i < alignmentsList.length; i++) {
    const alignment = alignmentsList[i]

    if (alignment.endTag) {
      const _alignment = { ...alignment }
      delete _alignment.endTag
      alignmentsList[i] = _alignment
    }
  }
  return alignmentsList
}

/**
 * do a fetch of manifest and book of the bible specified in fetchParams.
 *
 *    TRICKY - this function is being called by every scripture card simultaneously during book navigation, so it is
 *      very important that it does not cause significant delays (particularly on slower devices) and block UI or
 *      state updates.
 *
 * @param {BookFetchParams} fetchParams
 */
export async function fetchBibleBookCore(fetchParams: BookFetchParams) {
  try {
    console.log(`fetchBibleBookCore() - FETCHING bible ${fetchParams?.resourceLink}`, fetchParams)

    // fetch manifest data
    const resource = await core.resourceFromResourceLink(fetchParams)

    if (!resource?.manifest || !resource?.project?.file) {
      const errorMsg = resource?.manifest ? 'parsing resource manifest' : 'loading resource manifest'
      console.warn(`fetchBibleBookCore() - error ${errorMsg}`, fetchParams )
      return { error: errorMsg, resourceError: true }
    }

    console.log(`fetchBibleBookCore() - LOADED bible manifest, fetching book  ${fetchParams?.resourceLink}`, fetchParams)
    const response = await resource?.project?.file()
    // parse book usfm
    const bibleUsfm = response && core.getResponseData(response)
    await delay(100) // allow UI to update between two computationally expensive functions
    const bookObjects = bibleUsfm && usfmjs.toJSON(bibleUsfm) // convert to bible objects

    if (!bookObjects) {
      const errorMsg = bibleUsfm ? 'fetching book of the bible' : 'parsing book of the bible'
      console.warn(`fetchBibleBookCore() - error ${errorMsg}`, fetchParams )
      return { error: errorMsg }
    }

    const {
      name,
      sha,
      url,
    } = response?.data || {}

    console.log(`fetchBibleBookCore() - LOADED bible book,  ${fetchParams?.resourceLink}`, fetchParams)
    return {
      ...resource,
      bibleUsfm,
      bookObjects,
      name,
      response,
      sha,
      url,
    }
  } catch (e) {
    const errorMsg = 'hard error loading resource'
    console.error(`fetchBibleBookCore() - ${errorMsg}`, fetchParams, e )
    return { error: errorMsg }
  }
}

/**
 * do a fetch of manifest and book of the bible specified in fetchParams
 * @param {string} server - server to access
 * @param {ServerConfig} config
 * @param {ScriptureResource} resource
 * @param {ScriptureReference} reference
 */
export async function fetchBibleBook(server: string, config: ServerConfig, resource: ScriptureResource, reference: ScriptureReference) {
  const ref_ = resource?.branch || resource?.ref
  const resourceLink = getResourceLink({
    ...resource,
    resourceId: resource?.projectId || '',
    projectId: reference?.projectId || '',
    ref: ref_,
  })

  let fetchParams: BookFetchParams = {
    config: {
      ...config,
      server,
    },
    resource,
    reference,
    resourceLink,
  }

  const results = await fetchBibleBookCore(fetchParams)
  return results
}
