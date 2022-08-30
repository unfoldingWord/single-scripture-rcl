// @ts-ignore
import { useEffect, useState } from 'react'
import { useBcvQuery, core } from 'scripture-resources-rcl'
import {
  CONTENT_NOT_FOUND_ERROR,
  ERROR_STATE,
  INITIALIZED_STATE,
  INVALID_MANIFEST_ERROR,
  LOADING_STATE,
  MANIFEST_NOT_LOADED_ERROR,
  SCRIPTURE_NOT_LOADED_ERROR,
} from 'translation-helps-rcl'
import { getResourceLink } from '../utils'
import {
  ServerConfig,
  ScriptureResource,
  ScriptureReference,
} from '../types'
import { parseResourceManifest } from './parseResourceManifest'

const arrayToObject = (array: any[], keyField: string) =>
  array.reduce((obj, item) => {
    let iCopy = Object.assign({}, item)
    delete iCopy[keyField]
    obj[item[keyField]] = iCopy
    return obj
  }, {})

interface Props {
  /** optional current reference - in case a single verse is expected **/
  reference?: ScriptureReference;
  /** optional query with expected return structure - in case of multiple verses **/
  bcvQuery?: any;
  /** where to get data **/
  config: ServerConfig;
  /** optional direct path to bible resource, in format ${owner}/${languageId}/${projectId}/${branch} **/
  resourceLink: string|undefined;
  /** optional resource object to use to build resourceLink **/
  resource: ScriptureResource|undefined;
}

export function useScripture({
  config,
  reference,
  bcvQuery,
  resource: resource_,
  resourceLink: resourceLink_,
} : Props) {
  const [initialized, setInitialized] = useState(false)
  let resourceLink = resourceLink_
  let matchedVerse = reference && reference.verse

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

  const curQuery = bcvQuery || {
    resourceLink,
    server: config.server,
    book: {
      [reference.projectId] : {
        ch: { 
          [reference.chapter]: { v: { [reference.verse]: { verseObjects: [] } } },
        },
      },
    },
  }

  console.log(useBcvQuery)
  const {
    state: {
      resource, // Deprecated field
      content, // Deprecated field
      resultTree,
      loadingResource,
      loadingContent,
      fetchResponse,
    },
  } = useBcvQuery( curQuery, config)

  /*
  success,
  resultTree,
  errorCode,
*/

  const { title, version } = parseResourceManifest(resource)
  const bookResult = resultTree && resultTree.book

  // transform tree result to flat array
  const vObjArray = []

  if (bookResult) {
    // @ts-ignore
    Object.entries(bookResult).forEach(([bookKey, { ch }]) => {
      // @ts-ignore
      Object.entries(ch).forEach(([chNum, { v }]) => {
        // @ts-ignore
        Object.entries(v).forEach(([vNum, { verseObjects }]) => {
          if (verseObjects && verseObjects.length>0) {
            vObjArray.push({ id: `${chNum}:${vNum}`, verseObjects })
          }
        })
      })
    })
  }

  // transform array to single non-hierarchical object
  const verseObjectsArray = arrayToObject(vObjArray,'id')

  let bibleJson = content
  //  let { verseObjects } = bibleJson || {}
  let verseObjects = []
  const { languageId } = resource_ || {}
  const loading = loadingResource || loadingContent
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
    if (!initialized) {
      if (loading) { // once first load has begun, we are initialized
        setInitialized(true)
      }
    }
  }, [initialized, loading])

  // if (languageId === 'el-x-koine' || languageId === 'hbo') {
  verseObjects = core.occurrenceInjectVerseObjects(verseObjects)
  // }

  return {
    title,
    version,
    reference,
    resourceLink,
    matchedVerse,
    verseObjects,
    verseObjectsArray,
    resultTree,
    resourceStatus,
    fetchResponse,
  }
}
