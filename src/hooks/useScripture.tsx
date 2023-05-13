// @ts-ignore
import {
  useEffect,
  useState,
} from 'react'
import {
  core,
  useRsrc,
} from 'scripture-resources-rcl'
import {
  CONTENT_NOT_FOUND_ERROR,
  ERROR_STATE,
  INITIALIZED_STATE,
  INVALID_MANIFEST_ERROR,
  LOADING_STATE,
  MANIFEST_NOT_LOADED_ERROR,
  SCRIPTURE_NOT_LOADED_ERROR,
} from 'translation-helps-rcl'
import { getVerses } from 'bible-reference-range'
import * as isEqual from 'deep-equal'
import { cleanupVerseObjects, getResourceLink } from '../utils/ScriptureSettings'
import {
  ServerConfig,
  ScriptureResource,
  ScriptureReference,
} from '../types'
import { parseResourceManifest } from './parseResourceManifest'

interface Props {
  /** reference for scripture **/
  reference: ScriptureReference;
  /** where to get data **/
  config: ServerConfig;
  /** optional direct path to bible resource, in format ${owner}/${languageId}/${projectId}/${branch} **/
  resourceLink: string|undefined;
  /** optional resource object to use to build resourceLink **/
  resource: ScriptureResource|undefined;
  /** if true then fetch the entire book */
  wholeBook: boolean;
  /** if true then settings are ready for fetching data */
  readyForFetch: boolean;
}

/**
 * extract branch from resource link
 * @param resourceLink
 */
function getBranchName(resourceLink: string) {
  let branch = null
  resourceLink = resourceLink || ''
  const parts = resourceLink.split('?ref=')

  if (parts.length > 1) { // if ref parameter found, get branch name after
    branch = parts?.[1]
  } else { // fall back to using useRsrc format such as "unfoldingWord/en/ust/master"
    const _parts = resourceLink.split('/')
    branch = _parts?.[3]
  }
  return branch
}

/**
 * get the verse objects for the reference string
 * @param {string} refStr - in format <chapter>:<verse>
 * @param {object} bookObjects - parsed usfm for book
 * @param {string} languageId
 * @return {array|null} - of verseObjects
 */
export function getVersesForRefStr(refStr, bookObjects, languageId) {
  if (bookObjects) {
    let verses = getVerses(bookObjects.chapters, refStr)

    if (languageId === 'el-x-koine' || languageId === 'hbo') {
      verses = verses.map(verse => {
        if ( verse?.verseData?.verseObjects) {
          let verseObjects_ = core.occurrenceInjectVerseObjects( verse.verseData.verseObjects)
          verseObjects_ = cleanupVerseObjects(verseObjects_)
          verse.verseData.verseObjects = verseObjects_
        }
        return verse
      })
    }

    return verses
  }
  return null
}

/**
 * get the verse objects for the reference object
 * @param {object} reference
 * @param {object} bookObjects - parsed usfm for book
 * @param {string} languageId
 * @return {array|null} - of verseObjects
 */
export function getVersesForRef(reference, bookObjects, languageId) {
  const refStr = `${reference.chapter}:${reference.verse}`
  return getVersesForRefStr(refStr, bookObjects, languageId)
}

export function useScripture({ // hook for fetching scripture
  config,
  readyForFetch,
  reference,
  resource: resource_,
  resourceLink: resourceLink_,
  wholeBook = false,
} : Props) {
  const [state, setState_] = useState({
    bookObjects: null,
    fetchedBook: '',
    fetchParams: { resourceLink: '', reference: {} },
    ignoreSha: null,
    initialized: false,
    fetched: false,
    resourceState: {
      bibleJson: null,
      matchedVerse: null,
      resource: null,
      content: null,
      loadingResource: false,
      loadingContent: false,
      fetchResponse: null,
    },
    versesForRef: [],
  })

  const {
    bookObjects,
    fetchedBook,
    fetchParams,
    fetched,
    ignoreSha,
    initialized,
    resourceState,
    versesForRef,
  } = state
  const _bookId = reference?.projectId

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  useEffect(() => {
    if (readyForFetch) {
      console.log(`useScripture - readyForFetch true, initializing`)
      let resourceLink = readyForFetch && resourceLink_

      if (!resourceLink_ && resource_) {
        const {
          owner,
          languageId,
          projectId,
          branch = 'master',
          ref = null,
        } = resource_ || {}
        const ref_ = ref || branch

        resourceLink = getResourceLink({
          owner,
          languageId,
          resourceId: projectId,
          ref: ref_,
        })
      }

      const bookRef = { ...reference }

      if (wholeBook) {
        delete bookRef.chapter // remove the chapter and verse so the whole book is fetched
        delete bookRef.verse
      }

      if (resourceLink !== fetchParams?.resourceLink) {
        console.log(`useScripture - for ${resource_?.projectId} resourceLink is now ${resourceLink} and resourceLink_=${resourceLink_}`)
      } else if (bookRef !== fetchParams?.reference) {
        console.log(`useScripture - book changed to ${resource_?.projectId} resourceLink is now ${resourceLink}`)
      }

      const newFetchParams = {
        resourceLink,
        reference: bookRef,
      }

      if (!isEqual(newFetchParams, fetchParams)) {
        console.log(`useScripture - FETCHING new params ${resource_?.projectId} resourceLink is now ${resourceLink} and resourceLink_=${resourceLink_}`, newFetchParams)
        setState({
          fetchParams: newFetchParams,
          fetched: false,
          ignoreSha: null,
        })
      }
    }
  }, [readyForFetch, _bookId, resourceLink_])

  useEffect(() => {
    console.log(`useScripture - for ${resource_?.projectId} readyForFetch is now ${readyForFetch}`)
  }, [readyForFetch])

  const options = { getBibleJson: true }

  const _resourceResults = useRsrc({
    config,
    reference: fetchParams?.reference,
    resourceLink: fetchParams?.resourceLink,
    options,
  })

  // only use the results if readyToFetch
  const {
    bibleJson,
    content,
    fetchResponse,
    loadingResource,
    loadingContent,
    matchedVerse,
    resource,
  } = resourceState

  useEffect(() => { // validate response to make sure from latest request
    if (readyForFetch) {
      const currentResourceState = _resourceResults?.state

      if (!fetched && !isEqual(currentResourceState, resourceState)) {
        const {
          content,
          fetchResponse,
          loadingContent,
          loadingResource,
        } = currentResourceState
        // console.log(`useScripture resources changed`, { content, fetchParams, fetchResponse })

        if (!loadingContent && !loadingResource && content && fetchResponse) {
          const newState = { resourceState: currentResourceState }
          // console.log(`useScripture content changed`, { content, fetchParams, fetchResponse })

          // TRICKY - responses from server can come back from previous requests.  So we make sure this response is for the current requested book
          let sameBook = false
          // @ts-ignore
          const expectedBookId = _bookId || ''
          const fetchedBook = content.name

          if (fetchedBook && expectedBookId) {
            const [name, ext] = fetchedBook.split('.')

            if (ext.toLowerCase() === 'usfm') {
              sameBook = name.toLowerCase().includes(expectedBookId.toLowerCase())
            }
          }

          const sha = fetchResponse?.data?.sha || null
          const url = fetchResponse?.data?.url || null

          if (sameBook) { // also make sure it is the same branch
            const fetchedBranch = getBranchName(url)
            const fetchingBranch = getBranchName(fetchParams?.resourceLink)

            if (fetchedBranch !== fetchingBranch) {
              // console.log(`useScripture invalid branch, expected branch is ${fetchingBranch}, but fetchedBranch is ${fetchedBranch}`, { sha, url })
              sameBook = false
            }
          }

          if (ignoreSha === sha) {
            // console.log(`useScripture - the sha is the same as the ignore sha ${sha}`, { sha, url })
            sameBook = false
          }

          if (!sameBook) {
            // console.log(`useScripture invalid book, expectedBookId is ${expectedBookId}, but received book name ${fetchedBook}`, { sha, url })
          } else {
            newState['bookObjects'] = content
            newState['versesForRef'] = updateVersesForRef(content)
            newState['fetchedBook'] = expectedBookId

            if (!isEqual(newState, {
              bookObjects,
              versesForRef,
              fetchedBook: expectedBookId,
              resourceState,
            })) {
              console.log(`useScripture correct book, expectedBookId is ${expectedBookId}`, { sha, url })
              newState['fetched'] = true
              newState['ignoreSha'] = null
              setState(newState)
            }
          }
        } else {
          if (!isEqual(currentResourceState, resourceState)) {
            // console.log(`useScripture state changed, but no content`, currentResourceState)
            setState({ resourceState: currentResourceState })
          }
        }
      }
    }
  }, [readyForFetch, _resourceResults?.state])

  const { title, version } = parseResourceManifest(resource)
  const { languageId } = resource_ || {}
  const loading = loadingResource || loadingContent || !readyForFetch
  const contentNotFoundError = !content
  const scriptureNotLoadedError = !bibleJson
  const manifestNotFoundError = !resource?.manifest
  const invalidManifestError = !title || !version || !languageId
  const error = readyForFetch && initialized && !loading &&
    (contentNotFoundError || scriptureNotLoadedError || manifestNotFoundError || invalidManifestError)
  const resourceStatus = {
    [LOADING_STATE]: loading,
    [CONTENT_NOT_FOUND_ERROR]: contentNotFoundError,
    [SCRIPTURE_NOT_LOADED_ERROR]: scriptureNotLoadedError,
    [MANIFEST_NOT_LOADED_ERROR]: manifestNotFoundError,
    [INVALID_MANIFEST_ERROR]: invalidManifestError,
    [ERROR_STATE]: error,
    [INITIALIZED_STATE]: initialized,
  }

  useEffect(() => {
    if (!readyForFetch) {
      if (initialized) {
        setState({ intialized: false })
      }
    } else if (!initialized) {
      if (loading) { // once first load has begun, we are initialized
        setState({ intialized: true })
      }
    }
  }, [loading, readyForFetch])

  /**
   * get verses for ref
   * @param refStr
   * @param content_
   */
  function _getVersesForRef(refStr, content_ = bookObjects) {
    if (content_) {
      return getVersesForRefStr(refStr, content_, languageId)
    }
    return null
  }

  function updateVerse(chapter, verse, verseData) {
    if (bookObjects) {
      const bookObjects_ = { ...bookObjects } // shallow copy

      if (bookObjects_?.chapters) {
        bookObjects_.chapters = { ...bookObjects_.chapters } // shallow copy chapters

        if (bookObjects_.chapters[chapter]) {
          bookObjects_.chapters[chapter] = { ...bookObjects_.chapters[chapter] } // shallow copy verses
          bookObjects_.chapters[chapter][verse] = verseData
          setState({ bookObjects: bookObjects_ })
          return bookObjects_
        }
      }
    }
    return null
  }

  function updateVersesForRef(_bookObjects = bookObjects) {
    let newVersesForRef = []

    if (_bookObjects) {
      newVersesForRef = getVersesForRef(reference, _bookObjects, languageId)
      return newVersesForRef
    }

    return null
  }

  /**
   * force reload of current resource
   * @param {string|undefined} ignoreSha - optional sha to ignore
   */
  function reloadResource(ignoreSha) {
    const _reloadResource = _resourceResults?.actions.reloadResource

    if (_reloadResource) {
      const newState = { fetched: false }

      if (ignoreSha) { // TRICKY - if the response was for this sha (which was the previous sha) then we need to ignore it
        newState['ignoreSha'] = ignoreSha
      }
      setState( newState)
      _reloadResource()
    }
  }

  // @ts-ignore
  const currentBookRef = fetchParams?.reference?.projectId

  useEffect(() => {
    if (currentBookRef) {
      console.log(`useScripture fetched book changed to ${currentBookRef}, ${resourceLink_}`, { content, fetchParams })
      setState({ bookObjects: null })
    }
    // @ts-ignore
  }, [currentBookRef])

  useEffect(() => {
    console.log(`useScripture book ref changed to ${_bookId}, ${resourceLink_}`)
    // @ts-ignore
  }, [_bookId])

  useEffect(() => {
    const expectedBookId = _bookId || ''
    const fetchedBookSame = fetchedBook && (fetchedBook === expectedBookId)
    let _versesForRef = []

    if (!fetchedBookSame) {
      // if (expectedBookId && fetchedBook) {
      //   console.log(`useScripture expected book ${expectedBookId} but fetched book was ${fetchedBook} - clearing`)
      // }
    } else {
      const _bookObjects = fetchedBookSame ? bookObjects : null
      _versesForRef = updateVersesForRef(_bookObjects)
      // console.log(`useScripture _bookObjects is ${!!_bookObjects} and books are the same ${fetchedBook}`, { content, fetchParams })
    }

    if (!isEqual(_versesForRef, versesForRef)) {
      setState({ versesForRef: _versesForRef })
    }
  }, [reference])

  return {
    bookObjects,
    fetchResponse,
    getVersesForRef: _getVersesForRef,
    matchedVerse,
    reference: fetchParams?.reference,
    reloadResource,
    resourceLink: fetchParams?.resourceLink,
    resourceStatus,
    title,
    updateVerse,
    version,
    versesForRef,
  }
}
