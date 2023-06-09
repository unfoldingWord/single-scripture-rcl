import * as React from 'react'
import * as PropTypes from 'prop-types'
import { core, SelectionsContextProvider } from 'scripture-resources-rcl'
import usfmjs from 'usfm-js'
import { useEdit } from 'gitea-react-toolkit'
import { IconButton } from '@mui/material'
import { RxLink2, RxLinkBreak2 } from 'react-icons/rx'
import {
  Card,
  ErrorDialog,
  ERROR_STATE,
  MANIFEST_NOT_LOADED_ERROR,
  UpdateBranchButton,
  useBranchMerger,
  useCardState,
  useContentUpdateProps,
  useMasterMergeProps,
  useUserBranch,
} from 'translation-helps-rcl'
// @ts-ignore
import { getQuoteMatchesInBookRef } from 'uw-quote-helpers'
import { AlignmentHelpers, UsfmFileConversionHelpers } from 'word-aligner-rcl'
import * as isEqual from 'deep-equal'
import { getVerses } from 'bible-reference-range'
import { ScripturePane, ScriptureSelector } from '..'
import { useScriptureSettings } from '../../hooks/useScriptureSettings'
import {
  cleanupVerseObjects,
  fixOccurrence,
  getResourceLink,
  getResourceMessage,
  getScriptureVersionSettings,
  isOriginalBible,
} from '../../utils/ScriptureSettings'
import { delay } from '../../utils/delay'
import { areMapsTheSame } from '../../utils/maps'
import { Title } from '../ScripturePane/styled'
import {
  NT_ORIG_LANG,
  ORIGINAL_SOURCE,
  OT_ORIG_LANG,
} from '../../utils'
import { VerseSelectorPopup } from '../VerseSelectorPopup'

const KEY_FONT_SIZE_BASE = 'scripturePaneFontSize_'
const label = 'Version'
const style = { marginTop: '16px', width: '500px' }

/**
 * create a short comparison verse ref object without all the verseData
 * @param verseRef
 */
function compareObject(verseRef) {
  const {
    chapter,
    verse,
    verseData,
  } = verseRef || {}
  const verseObjects = verseData?.verseObjects?.length ? JSON.stringify(verseData.verseObjects) : ""
  return {
    chapter,
    verse,
    verseObjects,
  }
}

/**
 * compare two verse refs to see if they are substantially similar
 * @param versesForRef1
 * @param versesForRef2
 */
function areVersesSame(versesForRef1: any[], versesForRef2: any[]) {
  versesForRef1 = versesForRef1 || []
  versesForRef2 = versesForRef2 || []
  let areSame = false

  if (versesForRef1.length === versesForRef2.length) {
    areSame = true

    for (let i = 0, l= versesForRef1.length; i < l; i++) {
      const verse1 = compareObject(versesForRef1[i])
      const verse2 = compareObject(versesForRef2[i])
      areSame = isEqual(verse1, verse2)

      if (!areSame) {
        break
      }
    }
  }

  return areSame
}

export default function ScriptureCard({
  appRef,
  authentication,
  bookIndex,
  cardNum,
  classes,
  disableWordPopover,
  getLanguage,
  getLexiconData,
  greekRepoUrl,
  hebrewRepoUrl,
  httpConfig,
  id,
  isNT,
  loggedInUser,
  onMinimize,
  onResourceError,
  originalScriptureBookObjects,
  reference,
  resource: {
    owner,
    languageId,
    resourceId,
    originalLanguageOwner,
  },
  resourceLink,
  selectedQuote,
  server,
  setSavedChanges,
  setWordAlignerStatus,
  translate,
  title,
  useUserLocalStorage,
  updateMergeState,
  setCardsLoadingUpdate,
  setCardsLoadingMerge,
  setCardsSaving
}) {
  const bookId = reference?.projectId
  const [state, setState_] = React.useState({
    checkForEditBranch: 0,
    currentReference: null,
    editBranchReady: false,
    haveUnsavedChanges: false,
    lastSelectedQuote: null,
    readyForFetch: false,
    ref: appRef,
    saveClicked: false,
    saveContent: null,
    selections: new Map(),
    sha: null,
    showAlignmentPopup: false,
    startSave: false,
    urlError: null,
    usingUserBranch: false,
    unsavedChangesList: {},
    versesAlignmentStatus: null,
    versesForRef: null,
    verseObjectsMap: new Map(),
    verseSelectedForAlignment: null,
  })
  const {
    checkForEditBranch,
    currentReference,
    editBranchReady,
    haveUnsavedChanges,
    lastSelectedQuote,
    readyForFetch,
    ref,
    saveClicked,
    saveContent,
    selections,
    sha,
    showAlignmentPopup,
    startSave,
    urlError,
    usingUserBranch,
    unsavedChangesList,
    verseObjectsMap,
    verseSelectedForAlignment,
    versesAlignmentStatus,
    versesForRef,
  } = state

  const [fontSize, setFontSize] = useUserLocalStorage(KEY_FONT_SIZE_BASE + cardNum, 100)
  const isNT_ = isNT(bookId)

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  httpConfig = {
    ...httpConfig,
    cache: { maxAge: 0 },
    noCache: true,
  } // disable http caching

  const {
    isNewTestament,
    scriptureConfig,
    setScripture,
    scriptureSettings,
    scriptureVersionHist,
  } = useScriptureSettings({
    appRef: ref,
    cardNum,
    disableWordPopover,
    greekRepoUrl,
    hebrewRepoUrl,
    httpConfig,
    isNT,
    languageId,
    originalLanguageOwner,
    owner,
    readyForFetch,
    reference: currentReference || reference,
    resourceId,
    resourceLink,
    setUrlError: (error) => setState({ urlError: error }),
    server,
    title,
    useUserLocalStorage,
    wholeBook: true,
  })

  const fetchResp_ = scriptureConfig?.fetchResponse
  // @ts-ignore
  const repo = `${scriptureConfig?.resource?.languageId}_${scriptureConfig?.resource?.projectId}`
  const reference_ = scriptureConfig?.reference || null

  React.useEffect(() => { // get the _sha from last scripture download
    const _sha = fetchResp_?.data?.sha || null
    const url = fetchResp_?.data?.download_url || null
    let validBranch = true

    if (_sha) { // TRICKY: since this fetch may be delayed - make sure it was for the current branch before using the sha
      const parts = (url || '').split('/')
      const fetchBranch = parts.length > 7 ? parts[7] : ''
      validBranch = fetchBranch === ref
    }

    if (validBranch && _sha !== sha) {
      console.log(`ScriptureCard: for ${url} ${JSON.stringify(reference_)} new sha is ${_sha}`)
      setState({ sha: _sha })
    }
  }, [fetchResp_])

  // @ts-ignore
  const cardResourceId = scriptureConfig?.resource?.projectId || resourceId
  // @ts-ignore
  let ref_ = scriptureConfig?.resource?.ref || appRef
  const canUseEditBranch = !!(loggedInUser && authentication && (resourceId !== ORIGINAL_SOURCE) && // TRICKY if not original language and we have login data, then we can use the edit branch
    ((ref_ === 'master') || (ref_.includes(loggedInUser)))) // also make sure not a version tag

  const {
    state: {
      branchDetermined,
      userEditBranchName,
      usingUserBranch: _usingUserBranch,
      workingResourceBranch,
    },
    actions: {
      startEdit: startEditBranch,
      finishEdit,
    },
  } = useUserBranch({
    appRef,
    authentication: canUseEditBranch ? authentication : null,
    bookId,
    cardId: id,
    cardResourceId,
    checkForEditBranch,
    languageId,
    loggedInUser: canUseEditBranch ? loggedInUser : null,
    owner,
    onResourceError,
    server,
    useUserLocalStorage,
  })

  const _useBranchMerger = useBranchMerger({ server, owner, repo, userBranch: userEditBranchName, tokenid: authentication?.token?.sha1 });
  const {
    state: {
      mergeStatus: mergeToMaster,
      updateStatus: mergeFromMaster,
    },
  } = _useBranchMerger;

  const updateButtonProps = useContentUpdateProps({
    isSaving: startSave,
    useBranchMerger: _useBranchMerger,
    onUpdate: () => {
      delay(500).then(() => scriptureConfig?.reloadResource(sha))
    },
  });

  const {
    callUpdateUserBranch,
    isErrorDialogOpen,
    onCloseErrorDialog,
    isLoading: isUpdateLoading,
    dialogMessage,
    dialogTitle,
    dialogLink,
    dialogLinkTooltip,
  } = updateButtonProps

  const onMerge = () => {
    finishEdit()
    setState({ ref: appRef })
    delay(500).then(() => {
      scriptureConfig?.reloadResource()
    })
  }

  const { isLoading: isMergeLoading, callMergeUserBranch } = useMasterMergeProps({
    isSaving: startSave,
    useBranchMerger: _useBranchMerger,
    onMerge,
  })

  React.useEffect(() => {
    if (cardResourceId) {
      updateMergeState && updateMergeState(
        cardResourceId,
        mergeFromMaster,
        mergeToMaster,
        callUpdateUserBranch,
        callMergeUserBranch,
      )
    }
  },[cardResourceId, mergeFromMaster, mergeToMaster])

  React.useEffect(() => {
    if (isUpdateLoading) {
      setCardsLoadingUpdate?.(prevCardsLoading => [...prevCardsLoading, cardResourceId])
    } else {
      setCardsLoadingUpdate?.(prevCardsLoading => prevCardsLoading.filter(cardId => cardId !== cardResourceId))
    }
  }, [isUpdateLoading])

  React.useEffect(() => {
    if (isMergeLoading) {
      setCardsLoadingMerge?.(prevCardsLoading => [...prevCardsLoading, cardResourceId])
    } else {
      setCardsLoadingMerge?.(prevCardsLoading => prevCardsLoading.filter(cardId => cardId !== cardResourceId))
    }
  }, [isMergeLoading])

  const workingRef = canUseEditBranch ? workingResourceBranch : appRef
  let scriptureTitle

  if (!canUseEditBranch && !readyForFetch) { // if bible not eligible for user branch, make sure it's ready
    setState({ readyForFetch: true })
  }

  React.useEffect(() => {
    console.log(`ScriptureCard book changed`, { bookId, owner, languageId, resourceId })

    if (canUseEditBranch) { // if bible eligible for user branch, refresh it
      setState({ readyForFetch: false, checkForEditBranch: checkForEditBranch + 1 })
    }
  }, [bookId, owner, languageId, resourceId])

  React.useEffect(() => {
    if (!isEqual(reference, currentReference)) {
      // console.log(`ScriptureCard reference changed`, reference)
      setState({ currentReference: reference })
    }
  }, [reference])

  React.useEffect(() => { // waiting for branch fetch to complete
    console.log(`ScriptureCard branchDetermined is ${branchDetermined} and workingRef is ${workingRef} and readyForFetch is ${readyForFetch}`)

    if (!readyForFetch && branchDetermined ) {
      setState({ readyForFetch: true, ref: workingRef })
    }
  }, [branchDetermined])

  React.useEffect(() => { // select correct working ref - could be master, user branch, or release
    if (_usingUserBranch !== usingUserBranch) {
      setState({ usingUserBranch: _usingUserBranch })
    }
  }, [_usingUserBranch, usingUserBranch])

  React.useEffect(() => { // update display status if error
    const error = scriptureConfig?.resourceStatus?.[ERROR_STATE]

    if (error) { // if error was found do callback
      const resourceStatus = scriptureConfig?.resourceStatus
      const resourceLink = getResourceLink(scriptureConfig)
      const message = getResourceMessage(resourceStatus, server, resourceLink, isNT_)
      const isAccessError = resourceStatus[MANIFEST_NOT_LOADED_ERROR]
      onResourceError && onResourceError(message, isAccessError, resourceStatus)
    }
  }, [scriptureConfig?.resourceStatus?.[ERROR_STATE]])

  if (scriptureConfig.title && scriptureConfig.version) {
    scriptureTitle = `${scriptureConfig.title} v${scriptureConfig.version}`
    scriptureVersionHist.updateTitle(scriptureConfig.resourceLink, scriptureTitle)
  } else {
    scriptureTitle = `Title missing from project manifest`
  }

  /** Dynamically creates the scripture selection dropdown to be inserted into card settings */
  function getScriptureSelector() {
    const scriptureSelectionConfig = getScriptureVersionSettings({
      label,
      resourceLink: scriptureConfig.resourceLink,
      setScripture,
      scriptureVersionHist,
    })

    return <ScriptureSelector {...scriptureSelectionConfig} style={style} errorMessage={urlError} />
  }

  function onMenuClose() {
    // console.log(`onMenuClose()`)
    setState({ urlError: null })
  }

  // @ts-ignore
  const languageId_ = scriptureConfig?.resource?.languageId
  const language = getLanguage({ languageId: languageId_ })
  const direction = (language?.direction) || 'ltr'
  const _reference = currentReference || reference

  const isHebrew = (languageId_ === 'hbo')
  const fontFactor = isHebrew ? 1.4 : 1 // we automatically scale up font size for Hebrew
  const scaledFontSize = fontSize * fontFactor

  const items = null
  const {
    state: {
      headers, filters, itemIndex, markdownView,
    },
    actions: {
      setFilters, setItemIndex, setMarkdownView,
    },
  } = useCardState({ items })

  const refStyle = React.useMemo(() => ({
    fontFamily: 'Noto Sans',
    fontSize: `${Math.round(scaledFontSize * 0.9)}%`,
  }), [scaledFontSize])

  const contentStyle = React.useMemo(() => ({
    fontFamily: 'Noto Sans',
    fontSize: `${scaledFontSize}%`,
  }), [scaledFontSize])

  const scriptureLabel = <Title>{scriptureTitle}</Title>
  let disableWordPopover_ = disableWordPopover
  const usingOriginalBible = isOriginalBible(scriptureConfig['resource']?.projectId)

  if (disableWordPopover === undefined) { // if not specified, then determine if original language resource
    disableWordPopover_ = !usingOriginalBible
  }

  const enableEdit = !usingOriginalBible
  const enableAlignment = !usingOriginalBible
  const originalRepoUrl = isNewTestament ? greekRepoUrl : hebrewRepoUrl
  const scriptureAlignmentEditConfig = {
    authentication: canUseEditBranch ? authentication : null,
    bookIndex,
    currentVerseRef: _reference,
    enableEdit,
    enableAlignment,
    httpConfig,
    // @ts-ignore
    isNewTestament,
    loggedInUser: canUseEditBranch ? loggedInUser : null,
    originalLanguageOwner,
    // @ts-ignore
    originalRepoUrl,
    scriptureConfig,
    scriptureSettings,
    startEditBranch,
    setSavedChanges: _setSavedChanges,
    sourceLanguage: isNT_ ? NT_ORIG_LANG : OT_ORIG_LANG,
    targetLanguage: language,
    title: scriptureTitle,
    workingResourceBranch: ref,
  }

  /**
   * this gets called whenever a scripture pane has a change in save state
   * @param {number} currentIndex
   * @param {boolean} saved
   * @param {function} getChanges - will be called whenever user clicks save button
   * @param {function} clearChanges - will be called whenever save has completed
   * @param {object} state - current state of word alignment/edit
   */
  function _setSavedChanges(currentIndex, saved, { getChanges = null, clearChanges = null, state = null }) {
    const _unsavedChangesList = { ...unsavedChangesList }

    if (saved) {
      if (_unsavedChangesList.hasOwnProperty(currentIndex)) {
        delete _unsavedChangesList[currentIndex]
      }
    } else {
      _unsavedChangesList[currentIndex] = { getChanges, clearChanges, state } // update with latest
    }

    const _haveUnsavedChanges = !!Object.keys(_unsavedChangesList).length

    if (haveUnsavedChanges != _haveUnsavedChanges) {
      setSavedChanges && setSavedChanges(resourceId, !_haveUnsavedChanges)
      setState({ haveUnsavedChanges: _haveUnsavedChanges })
    }

    if (!isEqual(_unsavedChangesList, unsavedChangesList)) {
      setState({ unsavedChangesList: _unsavedChangesList })
    }
  }

  /**
   * search chapter or verse chunk to line that starts with findItem
   * @param {number|string} findItem
   * @param {string[]} chunks
   */
  function findRefInArray(findItem, chunks) {
    const ref_ = findItem + ''
    const refLen = ref_.length
    const index = chunks.findIndex((chunk, idx) => {
      if (idx > 0) {
        if (chunk.substring(0, refLen) === ref_) {
          const nextChar = chunk[refLen]

          if ((nextChar > '9') || (nextChar < '0')) {
            return true
          }
        }
      }
      return false
    })
    return index
  }

  function getBookName() {
    // @ts-ignore
    const bookCaps = scriptureConfig?.reference?.projectId ? scriptureConfig.reference.projectId.toUpperCase() : ''
    return `${bookIndex}-${bookCaps}.usfm`
  }

  const filepath = getBookName()

  // keep track of verse edit state
  const {
    error: saveError,
    isError: isSaveError,
    onSaveEdit,
  } = useEdit({
    sha,
    owner,
    content: saveContent,
    config: {
      cache: { maxAge: 0 },
      ...authentication?.config,
      token: authentication?.token,
      // @ts-ignore
      timeout: httpConfig?.serverTimeOut || httpConfig?.timeout || 10000,
      server,
    },
    author: loggedInUser,
    token: authentication?.token,
    branch: workingResourceBranch,
    filepath,
    repo,
  })

  React.useEffect(() => { // when we get a save saveError
    if (saveError && isSaveError) {
      console.log(`save error`, saveError)
      // onResourceError && onResourceError(null, false, null, `Error saving ${languageId_}_${resourceId} ${saveError}`, true)
    }
  }, [saveError, isSaveError])

  React.useEffect(() => { // when startSave goes true, save edits to user branch and then clear startSave
    const _saveEdit = async () => { // begin uploading new USFM
      console.info(`saveChangesToCloud() - Using sha: ${sha}`)
      await onSaveEdit(userEditBranchName).then((success) => { // push changed to server
        if (success) {
          console.log(`saveChangesToCloud() - save scripture edits success`)
          setCardsSaving(prevCardsSaving => prevCardsSaving.filter(cardId => cardId !== cardResourceId))
          setState({
            startSave: false,
          })

          const unsavedCardIndices = Object.keys(unsavedChangesList)

          if (unsavedCardIndices?.length) {
            for (const cardIndex of unsavedCardIndices) {
              const { clearChanges } = unsavedChangesList[cardIndex]
              clearChanges && clearChanges()
            }
          }

          console.info('saveChangesToCloud() - Reloading resource')
          setState({
            startSave: false,
            readyForFetch: true,
            ref: userEditBranchName,
          })
          delay(500).then(() => {
            setCardsSaving(prevCardsSaving => prevCardsSaving.filter(cardId => cardId !== cardResourceId))
            scriptureConfig?.reloadResource(sha)
          })
        } else {
          console.error('saveChangesToCloud() - saving changed scripture failed')
          setCardsSaving(prevCardsSaving => prevCardsSaving.filter(cardId => cardId !== cardResourceId))
          setState({ startSave: false })
        }
      })
    }

    if (startSave) {
      if (!editBranchReady) {
        // console.log(`saveChangesToCloud - edit branch not yet created`)
      } else if (!sha) {
        // console.log(`saveChangesToCloud - save sha not yet ready`)
      } else {
        // console.log(`saveChangesToCloud - calling _saveEdit()`)
        setCardsSaving(prevCardsSaving => [...prevCardsSaving, cardResourceId])
        _saveEdit()
      }
    }
  }, [startSave, editBranchReady, sha])

  /**
   * convert updatedVerseObjects to USFM and merge into the bibleUsfm
   * @param {string} bibleUsfm - USFM of bible
   * @param {object} ref - reference of verse to merge in
   * @param {object[]} updatedVerseObjects - new verse in verseObject format
   * @param {number} cardNum
   */
  function mergeVerseObjectsIntoBibleUsfm(bibleUsfm, ref, updatedVerseObjects, cardNum: number) {
    let newUsfm
    const chapterChunks = bibleUsfm?.split('\\c ')
    const chapterIndex = findRefInArray(ref?.chapter, chapterChunks)

    if (chapterIndex >= 0) {
      const currentChapter = chapterChunks[chapterIndex]
      const verseChunks = currentChapter.split('\\v ')
      const verseIndex = findRefInArray(ref?.verse, verseChunks)

      if (verseIndex >= 0) {
        const newVerseUsfm = UsfmFileConversionHelpers.convertVerseDataToUSFM(updatedVerseObjects)
        console.log(`saveChangesToCloud(${cardNum}) - new USFM for card:} - ${newVerseUsfm.substring(0, 100)}`)
        const oldVerse = verseChunks[verseIndex]
        const verseNumLen = (ref?.verse + '').length
        verseChunks[verseIndex] = oldVerse.substring(0, verseNumLen + 1) + newVerseUsfm
        const newChapter = verseChunks.join('\\v ')
        chapterChunks[chapterIndex] = newChapter
        newUsfm = chapterChunks.join('\\c ')
      }
    }
    return newUsfm
  }

  React.useEffect(() => { // for each unsaved change, call into scripturePane to get latest changes for verse to save
    async function getReadyForSave() {
      if (saveClicked) {
        let createEditBranch = !_usingUserBranch

        if (!createEditBranch) { // if already using the user branch
          if (workingResourceBranch !== userEditBranchName) {
            console.warn(`saveChangesToCloud - state conflict - should be in user branch ${userEditBranchName}, but actually using ${workingResourceBranch}`)
            createEditBranch = true
          } else {
            console.log(`saveChangesToCloud - already using edit branch: ${workingResourceBranch}`)
            setState({ editBranchReady: true })
          }
        }

        if (createEditBranch) { // if not yet using the user branch, create it
          console.log(`saveChangesToCloud - creating edit branch`)
          setState({
            editBranchReady: false,
            readyForFetch: false,
            sha: null,
          }) // we will need a new sha for book/branch

          const branch = await startEditBranch()

          if (branch) {
            console.log(`saveChangesToCloud - edit branch created`)
            setState({
              editBranchReady: true,
              readyForFetch: true,
              ref: branch,
            })
          } else {
            console.log(`saveChangesToCloud - failed to create edit branch`)
          }
        }

        console.log(`saveChangesToCloud - getting verse changes`)
        const unsavedCardIndices = Object.keys(unsavedChangesList)

        if (unsavedCardIndices?.length) {
          let bibleUsfm = core.getResponseData(scriptureConfig?.fetchResponse)
          let mergeFail = false
          let cardNum = 0

          for (const cardIndex of unsavedCardIndices) {
            cardNum = parseInt(cardIndex)
            const { getChanges, state } = unsavedChangesList[cardNum]

            if (getChanges) {
              let newUsfm
              const {
                ref,
                updatedVerseObjects,
              } = getChanges(state)

              if (updatedVerseObjects && bibleUsfm) { // just replace verse
                newUsfm = mergeVerseObjectsIntoBibleUsfm(bibleUsfm, ref, updatedVerseObjects, cardNum)
              }

              if (newUsfm) {
                bibleUsfm = newUsfm
              } else {
                mergeFail = true
                break
              }
            }
          }

          if (mergeFail) { // if we failed to merge, fallback to brute force verse objects to USFM
            console.log(`saveChangesToCloud(${cardNum}) - verse not found, falling back to inserting verse object`)
            let newBookJson

            for (const cardIndex of unsavedCardIndices) {
              const cardNum = parseInt(cardIndex)
              const { getChanges, state } = unsavedChangesList[cardNum]

              if (getChanges) {
                let newUsfm
                const {
                  newVerseText,
                  ref,
                  updatedVerseObjects,
                } = getChanges(state)

                if (updatedVerseObjects && !newUsfm) {
                  let targetVerseObjects_ = null

                  if (ref) {
                    if (newVerseText) {
                      const { targetVerseObjects } = AlignmentHelpers.updateAlignmentsToTargetVerse(updatedVerseObjects, newVerseText)
                      targetVerseObjects_ = targetVerseObjects
                    } else {
                      targetVerseObjects_ = updatedVerseObjects
                    }
                    newBookJson = targetVerseObjects_ && scriptureConfig?.updateVerse(ref.chapter, ref.verse, {verseObjects: targetVerseObjects_})
                  }
                }
              }
            }

            bibleUsfm = usfmjs.toUSFM(newBookJson, {forcedNewLines: true})
          }

          console.log(`saveChangesToCloud() - saving new USFM: ${bibleUsfm.substring(0, 100)}...`)
          setCardsSaving(prevCardsSaving => [...prevCardsSaving, cardResourceId])
          setState({saveContent: bibleUsfm, startSave: true, saveClicked: false})
        }
      }
    }

    getReadyForSave()
  }, [saveClicked])

  // @ts-ignore
  const { chapter } = _reference || {}

  React.useEffect(() => {
    const _versesForRef = scriptureConfig?.versesForRef
    let newSelections = new Map()
    let updateSelections = false
    const _map = newSelections
    const originalBookId = originalScriptureBookObjects?.bookId
    const bookVerseObject = originalScriptureBookObjects?.chapters
    let newSelectedQuote = null

    // if we have everything we need to calculate selections
    if (_versesForRef?.length &&
      bookVerseObject &&
      (bookId === originalBookId) &&
      bookVerseObject[chapter] && // we need to have data for chapter
      selectedQuote?.quote
    ) {
      // if quote is different than last
      if (!isEqual(lastSelectedQuote, selectedQuote) ||
        !isEqual(versesForRef, _versesForRef)) {
        const originalVerses = {}
        const substitute = {} // keep track of verse substitutions
        let startVerse = _versesForRef[0].verse

        if (typeof startVerse === 'string') {
          startVerse = parseInt(startVerse)
        }

        let lastVerse = startVerse

        for (let i = 0, l = _versesForRef.length; i < l; i++) {
          const verseRef = _versesForRef[i]
          const {
            chapter,
            verse,
          } = verseRef
          // TRICKY - we remap verses in reference range to a linear series of verses so verse spans don't choke getQuoteMatchesInBookRef
          let _verse = startVerse + i
          lastVerse = _verse
          substitute[`${chapter}:${_verse}`] = `${chapter}:${verse}`

          if (!originalVerses[chapter]) {
            originalVerses[chapter] = {}
          }

          let verseObjects = []

          if ((typeof verse === 'string') && (verse.includes('-'))) {
            const verses = getVerses(bookVerseObject, `${chapter}:${verse}`)

            for (const verseItem of verses) {
              const vo = verseItem.verseData.verseObjects
              verseObjects = verseObjects.concat(vo)
            }
          } else {
            verseObjects = bookVerseObject[chapter][verse]?.verseObjects
          }

          if (verseObjects) {
            verseObjects = cleanupVerseObjects(verseObjects)
            originalVerses[chapter][_verse] = { verseObjects }
            _map.set(`${chapter}:${verse}`, verseObjects)
          }
        }

        // create new reference range for new linear verse range
        const [chapter] = selectedQuote?.reference?.split(':')
        let subRef = `${chapter}:${startVerse}`

        if (lastVerse != startVerse) {
          subRef += `-${lastVerse}`
        }

        const quoteMatches = getQuoteMatchesInBookRef({
          bookObject: originalVerses,
          ref: subRef,
          quote: selectedQuote?.quote,
          occurrence: selectedQuote?.occurrence,
        })

        const selections = new Map()

        if (quoteMatches?.size) {
          quoteMatches.forEach((words, key) => {
            const _key = substitute[key]

            selections.set(_key, words.map(word => (
              { ...word, text: core.normalizeString(word.text) }
            )))
          })
        }
        newSelections = selections
        newSelectedQuote = selectedQuote
        updateSelections = true
      }
    }

    const newState: any = {}

    // update states that have changed
    if (!areMapsTheSame(verseObjectsMap, _map)) {
      newState.verseObjectsMap = _map
    }

    const booksNotSame = reference?.projectId !== currentReference?.projectId

    if (booksNotSame || !areVersesSame(versesForRef, _versesForRef)) {
      newState.versesForRef = _versesForRef
      newState.lastSelectedQuote = newSelectedQuote
      newState.selections = newSelections
    }

    if (newSelectedQuote) {
      newState.lastSelectedQuote = newSelectedQuote
    }

    if (updateSelections) {
      if (!areMapsTheSame(selections || (new Map()), newSelections)) {
        newState.selections = newSelections
      }
    }

    if (Object.keys(newState).length) {
      setState(newState)
    }
  }, [
    owner,
    resourceId,
    bookId,
    languageId_,
    scriptureConfig?.versesForRef,
    originalScriptureBookObjects,
    selectedQuote,
  ])

  React.useEffect(() => { // clear settings on verse change
    setState({
      versesAlignmentStatus: null,
      unsavedChangesList: {},
      haveUnsavedChanges: false,
    })
  }, [_reference])

  const updateVersesAlignmentStatus = (reference, aligned) => {
    setState_(prevState => ({
      ...prevState,
      versesAlignmentStatus: { ...prevState.versesAlignmentStatus, [`${reference.chapter}:${reference.verse}`]: aligned },
    }))
  }

  let _versesForRef = scriptureConfig?.versesForRef

  React.useEffect(() => {
    if (_versesForRef?.length) {
      const { reference, resourceLink } = scriptureConfig || {}
      console.log(`ScriptureCard._versesForRef changed`, { reference, resourceLink })
    }
  }, [_versesForRef])

  if (!_versesForRef?.length) { // if empty of references, create single empty reference
    _versesForRef = [{ ...reference }]
  }

  const renderedScripturePanes = versesForRef?.map((_currentVerseData, index) => {
    const initialVerseObjects = _currentVerseData?.verseData?.verseObjects || null
    // @ts-ignore
    const { chapter, verse } = _currentVerseData || {}
    const projectId = currentReference?.projectId || reference?.projectId
    const _reference = {
      ..._versesForRef,
      chapter,
      projectId,
      verse,
    }
    const _scriptureAlignmentEditConfig = {
      ...scriptureAlignmentEditConfig,
      currentIndex: index,
      initialVerseObjects,
      reference: _reference,
      isNewTestament,
    }

    let isVerseSelectedForAlignment = false

    if (verseSelectedForAlignment) {
      isVerseSelectedForAlignment = verseSelectedForAlignment.chapter == chapter && verseSelectedForAlignment.verse == verse
    }

    return (
      <ScripturePane
        {...scriptureConfig}
        contentStyle={contentStyle}
        currentIndex={index}
        determiningBranch={!readyForFetch}
        direction={direction}
        disableWordPopover={disableWordPopover_}
        fontSize={fontSize}
        getLexiconData={getLexiconData}
        isNT={isNT_}
        isVerseSelectedForAlignment={isVerseSelectedForAlignment}
        key={index}
        onAlignmentFinish={() => setState({ verseSelectedForAlignment: null })}
        originalScriptureBookObjects={originalScriptureBookObjects}
        refStyle={refStyle}
        reference={_reference}
        saving={startSave}
        // @ts-ignore
        scriptureAlignmentEditConfig={_scriptureAlignmentEditConfig}
        setWordAlignerStatus={setWordAlignerStatus}
        server={server}
        translate={translate}
        updateVersesAlignmentStatus={updateVersesAlignmentStatus}
      />
    )
  })

  const handleAlignButtonClick = () => {
    if (versesForRef?.length > 1) {
      setState({ showAlignmentPopup: true })
    } else if (versesForRef?.length === 1) {
      setState({ verseSelectedForAlignment: versesForRef[0] })
    }
  }

  const onRenderToolbar = ({ items }) => {
    const newItems = [...items]

    let allVersesAligned = false

    // Check if all values in versesAlignmentStatus are true
    if (versesAlignmentStatus) {
      allVersesAligned = Object.values(versesAlignmentStatus).every(alignStatus => alignStatus === true)
    }

    let alignIcon = null
    let alignButtonText = ''

    if (allVersesAligned) {
      alignIcon = <RxLink2 id={`valid_icon_${resourceId}`} color='#BBB' />
      alignButtonText = 'Alignment is Valid'
    } else {
      alignIcon = <RxLinkBreak2 id={`invalid_alignment_icon_${resourceId}`} color='#000' />
      alignButtonText = 'Alignment is Invalid'
    }

    if (setWordAlignerStatus && resourceId !== 'ORIGINAL_SOURCE') {
      newItems.push(
        <IconButton
          id={`alignment_icon_${resourceId}`}
          key='checking-button'
          onClick={handleAlignButtonClick}
          title={alignButtonText}
          aria-label={alignButtonText}
          style={{ cursor: 'pointer' }}
        >
          {alignIcon}
        </IconButton>
      )
    }

    newItems.push(
      <>
        <UpdateBranchButton {...updateButtonProps} isLoading={isUpdateLoading || startSave}/>
        <ErrorDialog title={dialogTitle} content={dialogMessage} open={isErrorDialogOpen} onClose={onCloseErrorDialog} isLoading={ isUpdateLoading || startSave } link={dialogLink} linkTooltip={dialogLinkTooltip} />
      </>
    )

    return newItems;
  }

  return (
    <SelectionsContextProvider
      selections={selections}
      onSelections={newSelections => {
        // console.log('onSelections', newSelections)
      }}
      quote={selectedQuote?.quote}
      occurrence={fixOccurrence(selectedQuote?.occurrence)}
      verseObjectsMap={verseObjectsMap}
    >
      <Card
        id={`scripture_card_${cardNum}`}
        title={scriptureLabel}
        settingsTitle={scriptureTitle + ' Settings'}
        items={items}
        classes={classes}
        headers={headers}
        filters={filters}
        fontSize={fontSize}
        itemIndex={itemIndex}
        setFilters={setFilters}
        setFontSize={setFontSize}
        setItemIndex={setItemIndex}
        markdownView={markdownView}
        setMarkdownView={setMarkdownView}
        getCustomComponent={getScriptureSelector}
        hideMarkdownToggle
        onMenuClose={onMenuClose}
        onMinimize={onMinimize ? () => onMinimize(id) : null}
        editable={enableEdit || enableAlignment}
        saved={startSave || !haveUnsavedChanges}
        onSaveEdit={() => setState({ saveClicked: true })}
        onRenderToolbar={onRenderToolbar}
      >
        <div id="scripture-pane-list">
          {renderedScripturePanes}
        </div>
      </Card>
      <VerseSelectorPopup
        resourceId={resourceId}
        open={showAlignmentPopup}
        onClose={() => setState({ showAlignmentPopup: false })}
        versesForRef={versesForRef}
        versesAlignmentStatus={versesAlignmentStatus}
        onVerseSelect={(verse) => setState({
          verseSelectedForAlignment: verse,
          showAlignmentPopup: false
        })}
      />
    </SelectionsContextProvider>
  )
}

ScriptureCard.propTypes = {
  /** repo branch or tag such as master */
  appRef: PropTypes.string.isRequired,
  /** authentication info */
  authentication: PropTypes.object,
  /** index for current book (e.g. '01' for 'gen')*/
  bookIndex: PropTypes.string,
  /** scripture card number (0 to 2 for example) */
  cardNum: PropTypes.number.isRequired,
  /** CSS classes */
  classes: PropTypes.object,
  /** if true then word data hover is shown */
  disableWordPopover: PropTypes.bool,
  /** get language details */
  getLanguage: PropTypes.func.isRequired,
  /** function to get latest lexicon data */
  getLexiconData: PropTypes.func,
  /** optional url for greek repo */
  greekRepoUrl: PropTypes.string,
  /** optional url for hebrew repo */
  hebrewRepoUrl: PropTypes.string,
  /** optional http timeout in milliseconds for fetching resources, default is 0 (very long wait) */
  httpConfig: PropTypes.object,
  /** html identifier to use for card */
  id: PropTypes.string,
  /** method to determine if NT or OT */
  isNT: PropTypes.func.isRequired,
  /** user-name */
  loggedInUser: PropTypes.string,
  /** function to minimize the card (optional) */
  onMinimize: PropTypes.func,
  /** optional callback if error loading resource, parameter returned are:
   *    ({string} errorMessage, {boolean} isAccessError, {object} resourceStatus)
   *      - isAccessError - is true if this was an error trying to access file
   *      - resourceStatus - is object containing details about problems fetching resource */
  onResourceError: PropTypes.func,
  /** the original scripture bookObjects for current book */
  originalScriptureBookObjects: PropTypes.object,
  reference: PropTypes.shape({
    /** projectId (bookID) to use */
    projectId: PropTypes.string.isRequired,
    /** current chapter number */
    chapter: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    /** current verse number */
    verse: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }),
  /** resource object */
  resource: PropTypes.shape({
    /** resource language to use */
    languageId: PropTypes.string.isRequired,
    /** repo owner such as unfoldingWord */
    owner: PropTypes.string.isRequired,
    /** resourceId to use (e.g. ugnt) */
    resourceId: PropTypes.string.isRequired,
    /** repo owner for original languages such as unfoldingWord */
    originalLanguageOwner: PropTypes.string.isRequired,
  }),
  /** resourceLink */
  resourceLink: PropTypes.any,
  /**This is currently selected quote */
  selectedQuote: PropTypes.object,
  /** server (e.g. 'https://git.door43.org') */
  server: PropTypes.string.isRequired,
  /** callback to update loading state */
  setAreResourcesLoading: PropTypes.func,
  /** callback to update saving state*/
  setAreResourcesSaving: PropTypes.func,
  /** callback to report card loading status */
  setCardsLoading: PropTypes.func,
  /** callback to report card savinging status */
  setCardsSaving: PropTypes.func,
  /** function to set state in app that there are unsaved changes */
  setSavedChanges: PropTypes.func,
  /** callback to update word aligner state */
  setWordAlignerStatus: PropTypes.func,
  /** title for scripture card */
  title: PropTypes.string.isRequired,
  /** optional function for localization */
  translate: PropTypes.func,
  /** callback to update the card's merge state in app */
  updateMergeState: PropTypes.func,
  /** use method for using local storage specific for user */
  useUserLocalStorage: PropTypes.func.isRequired,
}
