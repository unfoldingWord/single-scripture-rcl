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

export function useScripture({ // hook for fetching scripture
  config,
  readyForFetch,
  reference,
  resource: resource_,
  resourceLink: resourceLink_,
  wholeBook = false,
} : Props) {
  const [initialized, setInitialized] = useState(false)
  const [bookObjects, setBookObjects] = useState(null)
  const [versesForRef, setVersesForRef] = useState(null)
  const [fetchParams, setFetchParams] = useState({
    resourceLink: '',
    reference: {},
  })
  const [resourceResults, setResourceResults] = useState({
    bibleJson: null,
    matchedVerse: null,
    resource: null,
    content: null,
    loadingResource: false,
    loadingContent: false,
    fetchResponse: null,
  })
  const [fetchedBook, setFetchedBook] = useState('')

  useEffect(() => {
    if (readyForFetch) {
      console.log(`useScripture - readyForFetch`)
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
        console.log(`useScripture - new params ${resource_?.projectId} resourceLink is now ${resourceLink} and resourceLink_=${resourceLink_}`)
        setFetchParams(newFetchParams)
      }
    }
  }, [readyForFetch])

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
    matchedVerse,
    resource,
    content,
    loadingResource,
    loadingContent,
    fetchResponse,
  } = resourceResults

  useEffect(() => {
    if (readyForFetch) {
      const resourceResults = _resourceResults.state
      setResourceResults(resourceResults)
      const { content, fetchResponse } = resourceResults
      console.log(`useScripture resources changed`, { content, fetchParams, fetchResponse })

      if (content && fetchResponse) {
        console.log(`useScripture content changed`, { content, fetchParams, fetchResponse })
        let sameBook = false
        // @ts-ignore
        const expectedBookId = reference?.projectId || ''
        const fetchedBook = fetchResponse?.data?.name

        if (fetchedBook && expectedBookId) {
          const [name, ext] = fetchedBook.split('.')

          if (ext.toLowerCase() === 'usfm') {
            sameBook = name.toLowerCase().includes(expectedBookId.toLowerCase())
          }
        }

        if (!sameBook) {
          console.log(`useScripture invalid book, expectedBookId is ${expectedBookId}, but received book name ${fetchedBook}`)
        } else {
          setBookObjects(content)
          updateVersesForRef()
          setFetchedBook(expectedBookId)
        }
      } else {
        console.log(`useScripture no content`)
      }
    }
  }, [readyForFetch, _resourceResults])

  const { title, version } = parseResourceManifest(resource)
  const { languageId } = resource_ || {}
  const loading = loadingResource || loadingContent || !readyForFetch
  const contentNotFoundError = !content
  const scriptureNotLoadedError = !bibleJson
  const manifestNotFoundError = !resource?.manifest
  const invalidManifestError = !title || !version || !languageId
  const error = initialized && !loading &&
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
        setInitialized(false)
      }
    } else if (!initialized) {
      if (loading) { // once first load has begun, we are initialized
        setInitialized(true)
      }
    }
  }, [loading, readyForFetch])

  function getVersesForRef(ref, content_ = bookObjects) {
    if (content_) {
      let verses = getVerses(content_.chapters, ref)

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

  function updateVerse(chapter, verse, verseData) {
    if (bookObjects) {
      const bookObjects_ = { ...bookObjects } // shallow copy

      if (bookObjects_?.chapters) {
        bookObjects_.chapters = { ...bookObjects_.chapters } // shallow copy chapters

        if (bookObjects_.chapters[chapter]) {
          bookObjects_.chapters[chapter] = { ...bookObjects_.chapters[chapter] } // shallow copy verses
          bookObjects_.chapters[chapter][verse] = verseData
          setBookObjects(bookObjects_)
          return bookObjects_
        }
      }
    }
    return null
  }

  function updateVersesForRef(_bookObjects = bookObjects) {
    let newVersesForRef = null

    if (_bookObjects) {
      const ref = `${reference.chapter}:${reference.verse}`
      newVersesForRef = getVersesForRef(ref, _bookObjects)
    }

    if (!isEqual(newVersesForRef, versesForRef)) {
      setVersesForRef(newVersesForRef)
    }
  }

  useEffect(() => {
    console.log(`useScripture bookObjects changed`, { content, reference, resourceLink_ })
    updateVersesForRef()
  }, [bookObjects])

  useEffect(() => {
    console.log(`useScripture book changed to ${reference?.projectId}`, { content, fetchParams })
    setBookObjects(null)
    // @ts-ignore
  }, [fetchParams?.reference?.projectId])

  useEffect(() => {
    console.log(`useScripture reference changed`, { content, fetchParams })
    const expectedBookId = reference?.projectId || ''
    const fetchedBookSame = fetchedBook === expectedBookId

    if (!fetchedBookSame) {
      console.log(`useScripture expected book ${expectedBookId} but fetched book was ${fetchedBook}`)
    }

    const _bookObjects = fetchedBookSame ? bookObjects : null
    updateVersesForRef(_bookObjects)
  }, [fetchParams?.reference])

  return {
    title,
    version,
    reference: fetchParams?.reference,
    resourceLink: fetchParams?.resourceLink,
    matchedVerse,
    bookObjects,
    resourceStatus,
    fetchResponse,
    setBookObjects,
    getVersesForRef,
    versesForRef,
    updateVerse,
    reloadResource: _resourceResults.reloadResource,
  }
}
