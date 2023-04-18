import * as React from 'react'
import * as PropTypes from 'prop-types'
import { core } from 'scripture-resources-rcl'
import usfmjs from 'usfm-js'
import { useEdit } from 'gitea-react-toolkit'
import { MdUpdate, MdUpdateDisabled } from 'react-icons/md'
import { FiShare } from 'react-icons/fi'
import { IconButton } from '@mui/material'
import { RxLink2, RxLinkBreak2 } from 'react-icons/rx'
import {
  Card,
  useCardState,
  useUserBranch,
  ERROR_STATE,
  MANIFEST_NOT_LOADED_ERROR,
} from 'translation-helps-rcl'
import { AlignmentHelpers, UsfmFileConversionHelpers } from 'word-aligner-rcl'
import * as isEqual from 'deep-equal'
import { ScripturePane, ScriptureSelector } from '..'
import { useScriptureSettings } from '../../hooks/useScriptureSettings'
import {
  getResourceLink,
  getResourceMessage,
  getScriptureVersionSettings,
  isOriginalBible,
} from '../../utils/ScriptureSettings'
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

export default function ScriptureCard({
  id,
  isNT,
  title,
  server,
  appRef,
  cardNum,
  classes,
  resource: {
    owner,
    languageId,
    resourceId,
    originalLanguageOwner,
  },
  getLanguage,
  reference: {
    verse,
    chapter,
    projectId: bookId,
  },
  resourceLink,
  useUserLocalStorage,
  disableWordPopover,
  onResourceError,
  httpConfig,
  greekRepoUrl,
  hebrewRepoUrl,
  getLexiconData,
  fetchGlossesForVerse,
  translate,
  onMinimize,
  loggedInUser,
  authentication,
  setSavedChanges,
  bookIndex,
  addVerseRange,
  setWordAlignerStatus,
  updateMergeState,
}) {
  const [state, setState_] = React.useState({
    haveUnsavedChanges: false,
    ref: appRef,
    saveClicked: false,
    saveContent: null,
    sha: null,
    startSave: false,
    urlError: null,
    usingUserBranch: false,
    unsavedChangesList: {},
    versesForRef: null,
    showAlignmentPopup: false,
    verseSelectedForAlignment: null,
  })
  const {
    ref,
    saveClicked,
    saveContent,
    sha,
    startSave,
    urlError,
    usingUserBranch,
    unsavedChangesList,
    haveUnsavedChanges,
    versesForRef,
    showAlignmentPopup,
    verseSelectedForAlignment,
  } = state

  const [fontSize, setFontSize] = useUserLocalStorage(KEY_FONT_SIZE_BASE + cardNum, 100)
  const isNT_ = isNT(bookId)

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  if (usingUserBranch) {
    httpConfig = { ...httpConfig, cache: { maxAge: 0 } } // disable http caching
  }

  const {
    isNewTestament,
    scriptureConfig,
    setScripture,
    scriptureSettings,
    scriptureVersionHist,
  } = useScriptureSettings({
    isNT,
    title,
    verse,
    owner,
    bookId,
    appRef: ref,
    server,
    cardNum,
    chapter,
    languageId,
    resourceId,
    resourceLink,
    useUserLocalStorage,
    disableWordPopover,
    originalLanguageOwner,
    setUrlError: (error) => setState({ urlError: error }),
    httpConfig,
    greekRepoUrl,
    hebrewRepoUrl,
    wholeBook: true,
  })

  const fetchResp_ = scriptureConfig?.fetchResponse
  // @ts-ignore
  const repo = `${scriptureConfig?.resource?.languageId}_${scriptureConfig?.resource?.projectId}`
  const reference_ = scriptureConfig?.reference || null

  React.useEffect(() => { // get the _sha from last scripture download
    const _sha = fetchResp_?.data?.sha || null
    console.log(`for ${JSON.stringify(reference_)} new sha is ${_sha}`)

    if (_sha !== sha) {
      setState({ sha: _sha })
    }
  }, [fetchResp_])

  // @ts-ignore
  const cardResourceId = scriptureConfig?.resource?.projectId || resourceId
  // @ts-ignore
  let ref_ = scriptureConfig?.resource?.ref || appRef
  const canUseEditBranch = loggedInUser && authentication &&
    (resourceId !== ORIGINAL_SOURCE) &&
    ((ref_ === 'master') || (ref_.substring(0, loggedInUser.length) === loggedInUser) ) // not tag

  const {
    state: {
      workingResourceBranch,
      usingUserBranch: usingUserBranch_,
      mergeFromMaster,
      mergeToMaster,
      merging,
    },
    actions: {
      startEdit: startEditBranch,
      mergeFromMasterIntoUserBranch,
      mergeToMasterFromUserBranch,
    },
  } = useUserBranch({
    owner,
    server,
    appRef,
    languageId,
    cardId: id,
    loggedInUser: canUseEditBranch ? loggedInUser : null,
    authentication: canUseEditBranch ? authentication : null,
    cardResourceId,
    onResourceError,
    useUserLocalStorage,
  })

  React.useEffect(() => {
    if (cardResourceId) {
      updateMergeState && updateMergeState(
        cardResourceId,
        mergeFromMaster,
        mergeToMaster,
        mergeFromMasterIntoUserBranch,
        mergeToMasterFromUserBranch,
      )
    }
  },[cardResourceId, mergeFromMaster, mergeToMaster])

  const workingRef = canUseEditBranch ? workingResourceBranch : appRef
  let scriptureTitle

  React.useEffect(() => { // select correct working ref - could be master, user branch, or release
    if (usingUserBranch_ !== usingUserBranch) {
      setState({ usingUserBranch: usingUserBranch_ })
    }
  }, [usingUserBranch_, usingUserBranch])

  React.useEffect(() => { // select correct working ref - could be master, user branch, or release
    let workingRef_ = workingRef || appRef

    if (ref !== workingRef_) {
      setState({ ref: workingRef_ })
    }
  }, [workingRef, ref, appRef])

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
  const reference = { ...scriptureConfig.reference }

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

  React.useEffect(() => { // pre-cache glosses on verse change
    const fetchGlossDataForVerse = async () => {
      let verseObjects = []

      // get verse objects of all the verses
      for (const verseRef of scriptureConfig?.versesForRef || []) {
        const _verseObjects = verseRef?.verseData?.verseObjects
        verseObjects = verseObjects.concat(_verseObjects)
      }

      if (!disableWordPopover && verseObjects?.length && fetchGlossesForVerse) {
        // eslint-disable-next-line no-await-in-loop
        await fetchGlossesForVerse(verseObjects, languageId_)
      }
    }

    if (usingOriginalBible) {
      fetchGlossDataForVerse()
    }
  }, [ versesForRef, languageId_ ])

  const enableEdit = !usingOriginalBible
  const enableAlignment = !usingOriginalBible
  const originalRepoUrl = isNewTestament ? greekRepoUrl : hebrewRepoUrl
  const scriptureAlignmentEditConfig = {
    authentication: canUseEditBranch ? authentication : null,
    bookIndex,
    currentVerseRef: reference,
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
    const bookCaps = scriptureConfig?.reference?.projectId ? scriptureConfig.reference.projectId.toUpperCase() : ''
    return `${bookIndex}-${bookCaps}.usfm`
  }

  const filepath = getBookName()

  // keep track of verse edit state
  const { onSaveEdit } = useEdit({
    sha,
    owner,
    content: saveContent,
    config: {
      cache: { maxAge: 0 },
      ...authentication?.config,
      token: authentication?.token,
      // @ts-ignore
      timeout: httpConfig?.serverTimeOut || httpConfig?.timeout || 5000,
    },
    author: loggedInUser,
    token: authentication?.token,
    branch: workingResourceBranch,
    filepath,
    repo,
  })

  React.useEffect(() => { // when startSave goes true, save edits to user branch and then clear startSave
    const _saveEdit = async () => { // begin uploading new USFM
      let branch = (workingResourceBranch !== 'master') ? workingResourceBranch : undefined

      if (!branch) {
        branch = await startEditBranch() // make sure user branch exists and get name
      }

      await onSaveEdit(branch).then((success) => { // push changed to server
        if (success) {
          console.log(`saveChangesToCloud() - save scripture edits success`)
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
          scriptureConfig?.reloadResource()
        } else {
          console.error('saveChangesToCloud() - saving changed scripture failed')
          setState({ startSave: false })
        }
      })
    }

    if (startSave) {
      console.log(`saveChangesToCloud - calling _saveEdit()`)
      _saveEdit()
    }
  }, [startSave])

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

  React.useEffect(() => { // for each unsaved change, call into versePane to get latest changes for verse to save
    if (saveClicked) {
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
                  newBookJson = targetVerseObjects_ && scriptureConfig?.updateVerse(ref.chapter, ref.verse, { verseObjects: targetVerseObjects_ })
                }
              }
            }
          }

          bibleUsfm = usfmjs.toUSFM(newBookJson, { forcedNewLines: true })
        }

        console.log(`saveChangesToCloud() - saving new USFM: ${bibleUsfm.substring(0, 100)}...`)
        setState({ saveContent: bibleUsfm, startSave: true, saveClicked: false })
      }
    }
  }, [saveClicked])

  React.useEffect(() => {
    if (!isEqual(versesForRef, scriptureConfig?.versesForRef)) {
      const versesForRef = scriptureConfig?.versesForRef
      setState({ versesForRef })

      for (const verseRef of versesForRef || []) {
        // check for verse range
        const _verse = verseRef.verse

        if (addVerseRange && (typeof _verse === 'string')) {
          // @ts-ignore
          if (_verse.includes('-')) {
            addVerseRange(`${scriptureConfig?.reference?.chapter}:${_verse}`)
          }
        }
      }
    }
  }, [scriptureConfig?.versesForRef])

  const needToMergeFromMaster = mergeFromMaster?.mergeNeeded
  const mergeFromMasterHasConflicts = mergeFromMaster?.conflict
  const mergeToMasterHasConflicts = mergeToMaster?.conflict

  // eslint-disable-next-line no-nested-ternary
  const mergeFromMasterTitle = mergeFromMasterHasConflicts ? 'Merge Conflicts for update from master' : (needToMergeFromMaster ? 'Update from master' : 'No merge conflicts for update with master')
  // eslint-disable-next-line no-nested-ternary
  const mergeFromMasterColor = mergeFromMasterHasConflicts ? 'black' : (needToMergeFromMaster ? 'black' : 'lightgray')
  const mergeToMasterTitle = mergeToMasterHasConflicts ? 'Merge Conflicts for share with master' : 'No merge conflicts for share with master'
  const mergeToMasterColor = mergeToMasterHasConflicts ? 'black' : 'black'

  const renderedScripturePanes = versesForRef?.map((_currentVerseData, index) => {
    const initialVerseObjects = _currentVerseData?.verseData?.verseObjects || null
    // @ts-ignore
    const { chapter, verse } = _currentVerseData || {}
    const _reference = {
      ...reference,
      chapter,
      verse,
    }
    const _scriptureAlignmentEditConfig = {
      ...scriptureAlignmentEditConfig,
      currentIndex: index,
      initialVerseObjects,
      reference: _reference,
    }

    let isVerseSelectedForAlignment = false
    if (verseSelectedForAlignment) {
      isVerseSelectedForAlignment = verseSelectedForAlignment.chapter === chapter && verseSelectedForAlignment.verse === verse
    }

    return (
      <ScripturePane
        {...scriptureConfig}
        contentStyle={contentStyle}
        currentIndex={index}
        direction={direction}
        disableWordPopover={disableWordPopover_}
        fontSize={fontSize}
        getLexiconData={getLexiconData}
        isNT={isNT_}
        key={index}
        refStyle={refStyle}
        reference={_reference}
        saving={startSave}
        // @ts-ignore
        scriptureAlignmentEditConfig={_scriptureAlignmentEditConfig}
        setWordAlignerStatus={setWordAlignerStatus}
        server={server}
        translate={translate}
        merging={merging}
        isVerseSelectedForAlignment={isVerseSelectedForAlignment}
      />
    )
  })

  const alignButtonText = 'Align Verse(s)'
  // TODO: change button hover text if all verses are aligned
  // const checkingState = aligned ? 'valid' : 'invalid'
  // const alignButtonText = checkingState === 'valid' ? 'Alignment is Valid' : 'Alignment is Invalid'

  const onRenderToolbar = ({ items }) => {
    const newItems = [...items]

    // TODO: Hook it up to aligner status. But for now we can just display it to handle the uI.
    // if (setWordAlignerStatus) {
      newItems.push(
        <IconButton
          id={`alignment_icon_${resourceId}`}
          key='checking-button'
          onClick={() => setState({ showAlignmentPopup: true })}
          title={alignButtonText}
          aria-label={alignButtonText}
          style={{ cursor: 'pointer' }}
        >
          <RxLink2 id='valid_icon' color='#000' />
          {/* TODO: Change button color if all verses are aligned */}
          {/* {checkingState === 'valid' ? (
            <RxLink2 id='valid_icon' color='#BBB' />
          ) : (
            <RxLinkBreak2 id=`invalid_alignment_icon_${resourceId}` color='#000' />
          )} */}
        </IconButton>
      )
    // }

    if (mergeFromMaster) {
      newItems.push(
        <IconButton
          className={classes.margin}
          key='update-from-master'
          onClick={mergeFromMasterIntoUserBranch}
          title={mergeFromMasterTitle}
          aria-label={mergeFromMasterTitle}
          style={{ cursor: 'pointer' }}
        >
          {mergeFromMasterHasConflicts ?
            <MdUpdateDisabled id='update-from-master-icon' color={mergeFromMasterColor} />
            :
            <MdUpdate id='update-from-master-icon' color={mergeFromMasterColor} />
          }
        </IconButton>
      )
    }
    if (mergeToMaster) {
      newItems.push(
        <IconButton
          className={classes.margin}
          key='share-to-master'
          onClick={mergeToMasterFromUserBranch}
          title={mergeToMasterTitle}
          aria-label={mergeToMasterTitle}
          style={{ cursor: 'pointer' }}
        >
          {mergeToMasterHasConflicts ?
            <MdUpdateDisabled id='share-to-master-icon' color={mergeToMasterColor} />
            :
            <FiShare id='share-to-master-icon' color={mergeToMasterColor} />
          }
        </IconButton>
      )
    }
    return newItems;
  }

  return (
    <>
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
        onVerseSelect={(verse) => setState({ verseSelectedForAlignment: verse })}
      />
    </>
  )
}

ScriptureCard.propTypes = {
  /** html identifier to use for card */
  id: PropTypes.string,
  /** method to determine if NT or OT */
  isNT: PropTypes.func.isRequired,
  /** title for scripture card */
  title: PropTypes.string.isRequired,
  /** get language details */
  getLanguage: PropTypes.func.isRequired,
  /** scripture card number (0 to 2 for example) */
  cardNum: PropTypes.number.isRequired,
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
  reference: PropTypes.shape({
    /** projectId (bookID) to use */
    projectId: PropTypes.string.isRequired,
    /** current chapter number */
    chapter: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    /** current verse number */
    verse: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }),
  /** server (e.g. 'https://git.door43.org') */
  server: PropTypes.string.isRequired,
  /** repo branch or tag such as master */
  appRef: PropTypes.string.isRequired,
  /** if true then word data hover is shown */
  disableWordPopover: PropTypes.bool,
  /** CSS classes */
  classes: PropTypes.object,
  /** resourceLink */
  resourceLink: PropTypes.any,
  /** use method for using local storage specific for user */
  useUserLocalStorage: PropTypes.func.isRequired,
  /** optional callback if error loading resource, parameter returned are:
   *    ({string} errorMessage, {boolean} isAccessError, {object} resourceStatus)
   *      - isAccessError - is true if this was an error trying to access file
   *      - resourceStatus - is object containing details about problems fetching resource */
  onResourceError: PropTypes.func,
  /** optional http timeout in milliseconds for fetching resources, default is 0 (very long wait) */
  httpConfig: PropTypes.object,
  /** optional url for greek repo */
  greekRepoUrl: PropTypes.string,
  /** optional url for hebrew repo */
  hebrewRepoUrl: PropTypes.string,
  /** function to get latest lexicon data */
  getLexiconData: PropTypes.func,
  /** function to pre-load lexicon data for verse */
  fetchGlossesForVerse: PropTypes.func,
  /** optional function for localization */
  translate: PropTypes.func,
  /** function to minimize the card (optional) */
  onMinimize: PropTypes.func,
  /** user-name */
  loggedInUser: PropTypes.string,
  /** authentication info */
  authentication: PropTypes.object,
  /** function to set state in app that there are unsaved changes */
  setSavedChanges: PropTypes.func,
  /** index for current book (e.g. '01' for 'gen')*/
  bookIndex: PropTypes.string,
  /** callback to indicate that we are using a verse range here */
  addVerseRange: PropTypes.func,
  /** callback to update word aligner state */
  setWordAlignerStatus: PropTypes.func,
  /**callback to update the card's merge state in app */
  updateMergeState: PropTypes.func,
}
