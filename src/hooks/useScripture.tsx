// @ts-ignore
import {
  useEffect,
  useState,
} from 'react'
import { core } from 'scripture-resources-rcl'
import usfmjs from 'usfm-js'
import {
  CONTENT_NOT_FOUND_ERROR,
  ERROR_STATE,
  INITIALIZED_STATE,
  INVALID_MANIFEST_ERROR,
  LOADING_STATE,
  MANIFEST_NOT_LOADED_ERROR,
  SCRIPTURE_NOT_LOADED_ERROR,
} from 'translation-helps-rcl'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { getVerses } from 'bible-reference-range'
import * as isEqual from 'deep-equal'
import {
  cleanupVerseObjects,
  getBookNameFromUsfmFileName,
  getResourceLink,
} from '../utils/ScriptureSettings'
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

/**
 * compare specific fields in objects to see if they are all equal
 * @param {object} object1
 * @param {object} object2
 * @param {string[]} fields
 */
export function areFieldsSame(object1, object2, fields = []) {
  for (const field of fields) {
    const isSame = isEqual(object1[field], object2[field])

    if (!isSame) {
      return false
    }
  }
  return true
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
    bibleUsfm: null,
    bookObjects: null,
    fetchCount: 0,
    fetched: false,
    fetchedBook: '',
    fetchParams: {
      resourceLink: '',
      reference: {},
      config: {},
    },
    ignoreSha: null,
    initialized: false,
    resourceState: {
      bibleObjects: null,
      bibleUsfm: null,
      content: null,
      fetchResponse: null,
      fetchedResources: null,
      loadingResource: false,
      loadingContent: false,
      resource: null,
      sha: null,
      url: null,
    },
    versesForRef: [],
  })

  const {
    owner,
    languageId,
    branch = 'master',
    ref = null,
  } = resource_ || {}

  const { projectId: bookId} = reference || {}

  const {
    bibleUsfm,
    bookObjects,
    fetchCount,
    fetched,
    fetchedBook,
    fetchParams,
    ignoreSha,
    initialized,
    resourceState,
    versesForRef,
  } = state
  const fetchedResources = resourceState?.fetchedResources

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  useEffect(() => {
    if (readyForFetch) {
      initiateBookFetch()
    }

    async function initiateBookFetch() {
      console.log(`useScripture - readyForFetch true, initializing`)
      let resourceLink = readyForFetch && resourceLink_

      if (!resourceLink_ && resource_) {
        const ref_ = ref || branch

        resourceLink = getResourceLink({
          owner,
          languageId,
          resourceId: bookId,
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
        config,
      }

      if (!isEqual(newFetchParams, fetchParams)) {
        setState({
          fetchParams: newFetchParams,
          fetched: false,
          initialized: true,
        })

        await fetchBook(newFetchParams)
      }
    }
  }, [
    readyForFetch,
    owner,
    languageId,
    bookId,
    branch,
    ref,
  ])

  async function fetchBook(fetchParams, ignoreSha = null) {
    try {
      const _fetchCount = fetchCount + 1
      console.log(`useScripture - FETCHING bible ${resource_?.projectId} resourceLink is now ${fetchParams?.resourceLink} and resourceLink_=${fetchParams?.resourceLink_}`, fetchParams)
      setState({
        resourceState: { loadingResource: true },
        fetchCount: _fetchCount,
        fetched: false,
        ignoreSha,
      })

      // fetch manifest data
      const _resource = await core.resourceFromResourceLink(fetchParams)

      if (!_resource?.manifest || !_resource?.project?.file) {
        const errorMsg = _resource?.manifest ? 'parsing resource manifest' : 'loading resource manifest'
        console.warn(`useScripture - error ${errorMsg}`, fetchParams )
        setState({
          resourceState: {
            loadingResource: false,
            resource: _resource,
          },
        })
        return
      }

      console.log(`useScripture - LOADED bible manifest, fetching book ${resource_?.projectId} resourceLink is now ${fetchParams?.resourceLink} and resourceLink_=${fetchParams?.resourceLink_}`, fetchParams)
      const response = await _resource?.project?.file()
      // parse book usfm
      const bibleUsfm = response && core.getResponseData(response)
      const bibleObjects = bibleUsfm && usfmjs.toJSON(bibleUsfm) // convert to bible objects

      if (!bibleObjects) {
        const errorMsg = bibleUsfm ? 'fetching book of the bible' : 'parsing book of the bible'
        console.warn(`useScripture - error ${errorMsg}`, fetchParams )
        setState({
          resourceState: {
            loadingResource: false,
            resource: _resource,
          },
        })
        return
      }

      const { name, sha, url } = response?.data || {}

      console.log(`useScripture - LOADED bible book ${resource_?.projectId} resourceLink is now ${fetchParams?.resourceLink} and resourceLink_=${fetchParams?.resourceLink_}`, fetchParams)
      setState(
        {
          resourceState: {
            loadingResource: false,
            fetchedResources: {
              ..._resource,
              bibleUsfm,
              bibleObjects,
              fetchCount: _fetchCount,
              name,
              sha,
              url,
            },
          },
        },
      )
    } catch (e) {
      console.error(`useScripture - hard error loading resource`, fetchParams, e )
    }
  }

  useEffect(() => {
    console.log(`useScripture - for ${resource_?.projectId} readyForFetch is now ${readyForFetch}`)
  }, [readyForFetch])

  useDeepCompareEffect(() => { // validate response to make sure from latest request
    if (readyForFetch && fetchedResources) {
      if (!fetched && fetchedResources?.fetchCount === fetchCount) {
        // TRICKY - responses from server can come back from previous requests.  So we make sure this response is for the current requested book
        let isSameBook = false
        const newState = { resourceState: resourceState }
        // @ts-ignore
        const expectedBookId = bookId || 'zzz'
        const fetchedBook = getBookNameFromUsfmFileName(fetchedResources?.name)
        console.log(`Current bookId is ${bookId} and seeing ${fetchedBook} in USFM`)
        isSameBook = fetchedBook?.toLowerCase()?.includes(bookId)

        const sha = fetchedResources?.sha || null
        const url = fetchedResources?.url || null

        if (isSameBook) { // also make sure it is the same branch
          const fetchedBranch = getBranchName(url)
          const fetchingBranch = getBranchName(fetchParams?.resourceLink)

          if (fetchedBranch !== fetchingBranch) {
            console.log(`useScripture invalid branch, expected branch is ${fetchingBranch}, but fetchedBranch is ${fetchedBranch}`, { sha, url })
            isSameBook = false
          }
        } else {
          console.log(`useScripture invalid book, expectedBookId is ${expectedBookId}, but received book name ${fetchedBook}`, { sha, url })
        }

        if (ignoreSha === sha) {
          console.log(`useScripture - the sha is the same as the ignore sha ${sha}`, { sha, url })
          isSameBook = false
        }

        if (isSameBook) {
          const bibleUsfm_ = fetchedResources?.bibleUsfm;
          newState['bibleUsfm'] = bibleUsfm_
          const bibleObjects = fetchedResources?.bibleObjects
          newState['bookObjects'] = bibleObjects
          newState['versesForRef'] = updateVersesForRef(bibleObjects)
          newState['fetchedBook'] = expectedBookId
          const currentState = {
            bibleUsfm,
            bookObjects,
            fetchedBook: expectedBookId,
            resourceState,
            versesForRef,
          }

          if (!areFieldsSame(newState, currentState, Object.keys(currentState))) {
            console.log(`useScripture correct book, expectedBookId is ${expectedBookId}`, { sha, url })
            newState['fetched'] = true
            newState['ignoreSha'] = null
            const resourceState_ = {
              bibleObjects,
              bibleUsfm: bibleUsfm_,
              loadingResource: false,
              loadingContent: false,
              resource: fetchedResources,
              sha,
              url,
            }
            // @ts-ignore
            newState['resourceState'] = resourceState_
            setState(newState)
          }
        }
      }
    }
  }, [{ readyForFetch, fetchedResources }])

  const resource = resourceState?.resource
  const { title, version } = parseResourceManifest(resource)
  const loading = resourceState?.loadingResource || resourceState?.loadingContent || !readyForFetch
  const contentNotFoundError = !resourceState?.bibleUsfm
  const scriptureNotLoadedError = !resourceState?.bibleObjects
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
  async function reloadResource(ignoreSha = null) {
    await fetchBook(fetchParams, ignoreSha)
  }

  // @ts-ignore
  const currentBookRef = fetchParams?.reference?.projectId

  useEffect(() => {
    if (currentBookRef) {
      console.log(`useScripture fetched book changed to ${currentBookRef}, ${resourceLink_}`, fetchParams )
      setState({ bookObjects: null, bibleUsfm: null })
    }
    // @ts-ignore
  }, [currentBookRef])

  useEffect(() => {
    console.log(`useScripture book ref changed to ${bookId}, ${resourceLink_}`)
    // @ts-ignore
  }, [bookId])

  useEffect(() => {
    const expectedBookId = bookId || ''
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
    bibleUsfm,
    bookObjects,
    getVersesForRef: _getVersesForRef,
    reference: fetchParams?.reference,
    reloadResource,
    resourceLink: fetchParams?.resourceLink,
    resourceState, // state information for latest fetched resource
    resourceStatus, // status flags for fetched resource
    title,
    updateVerse,
    version,
    versesForRef,
  }
}
