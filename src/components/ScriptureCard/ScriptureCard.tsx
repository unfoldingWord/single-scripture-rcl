import * as React from 'react'
import * as PropTypes from 'prop-types'
import { core } from 'scripture-resources-rcl'
import usfmjs from 'usfm-js'
import { useEdit } from 'gitea-react-toolkit'
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
}) {
  const [state, setState_] = React.useState({
    ref: appRef,
    saveContent: null,
    sha: null,
    startSave: false,
    urlError: null,
    usingUserBranch: false,
    unsavedChanges: {},
  })
  const {
    ref,
    saveContent,
    sha,
    startSave,
    urlError,
    usingUserBranch,
    unsavedChanges,
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

  React.useEffect(() => { // get the sha from last scripture download
    const sha = fetchResp_?.data?.sha || null
    console.log(`for ${JSON.stringify(reference_)} new sha is ${sha}`)
    setState({ sha })
    // @ts-ignore
  }, [fetchResp_])

  // @ts-ignore
  const cardResourceId = scriptureConfig?.resource?.projectId || resourceId
  // @ts-ignore
  let ref_ = scriptureConfig?.resource?.ref || appRef
  const canUseEditBranch = loggedInUser && authentication &&
    (resourceId !== ORIGINAL_SOURCE) &&
    ((ref_ === 'master') || (ref_.substring(0, loggedInUser.length) === loggedInUser) ) // not tag

  const {
    state: { workingResourceBranch, usingUserBranch: usingUserBranch_ },
    actions: { startEdit: startEditBranch },
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
  }, [scriptureConfig?.resourceStatus?.[ERROR_STATE], onResourceError])

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
      for (const verseRef of scriptureConfig?.versesForRef || []) {
        const verseObjects = verseRef?.verseData?.verseObjects

        if (!disableWordPopover && verseObjects && fetchGlossesForVerse) {
          // eslint-disable-next-line no-await-in-loop
          await fetchGlossesForVerse(verseObjects, languageId_)
        }
      }
    }

    fetchGlossDataForVerse()
  }, [ scriptureConfig?.versesForRef, disableWordPopover, languageId_, fetchGlossesForVerse ])

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

  function _setSavedChanges(currentVerse, state, onSaveToCloud = null) {
    const _unsavedChanges = { ...unsavedChanges }

    if (state) {
      if (!_unsavedChanges.hasOwnProperty(currentVerse)) {
        _unsavedChanges[currentVerse] = onSaveToCloud
      }
    } else {
      if (_unsavedChanges.hasOwnProperty(currentVerse)) {
        delete _unsavedChanges[currentVerse]
      }
    }

    if (!isEqual(_unsavedChanges, unsavedChanges)) {
      setState({ unsavedChanges: _unsavedChanges })
    }

    const haveUnsavedChanges = Object.keys(unsavedChanges).length
    setSavedChanges && setSavedChanges(!haveUnsavedChanges)
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
          const nextChar = chunk[ref_]

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
            updatedVerseObjects: null,
            editing: false,
            newVerseText: null,
            alignerData: null,
            startSave: false,
            verseTextChanged: false,
            initialVerseText: null,
            saveInitiated: false,
          })
          console.info('saveChangesToCloud() - Reloading resource')
          scriptureConfig?.reloadResource()
        } else {
          console.error('saveChangesToCloud() - saving changed scripture failed')
          setState({ startSave: false, saveInitiated: false })
        }
      })
    }

    if (startSave) {
      console.log(`saveChangesToCloud - calling _saveEdit()`)
      _saveEdit()
    }
  }, [startSave])


  /**
   * for each unsaved change, call into versePane to get latest changes for verse to save
   */
  function saveChangesToCloud() {
    const keys = Object.keys(unsavedChanges)

    if (keys?.length) {
      setState({ doingSave: true })
      const originalUsfm = core.getResponseData(scriptureConfig?.fetchResponse)
      let updatedBibleUsfm = originalUsfm

      for (const index of keys) {
        const onSaveToCloud = unsavedChanges[index]

        if (onSaveToCloud) {
          let newUsfm
          const {
            newVerseText,
            ref,
            updatedVerseObjects,
          } = onSaveToCloud()

          if (updatedVerseObjects && updatedBibleUsfm) { // just replace verse
            const chapterChunks = updatedBibleUsfm?.split('\\c ')
            const chapterIndex = findRefInArray(ref?.chapter, chapterChunks)

            if (chapterIndex >= 0) {
              const currentChapter = chapterChunks[chapterIndex]
              const verseChunks = currentChapter.split('\\v ')
              const verseIndex = findRefInArray(ref?.verse, verseChunks)

              if (verseIndex >= 0) {
                const newVerseUsfm = UsfmFileConversionHelpers.convertVerseDataToUSFM(updatedVerseObjects)
                const oldVerse = verseChunks[verseIndex]
                const verseNumLen = (ref?.verse + '').length
                verseChunks[verseIndex] = oldVerse.substring(0, verseNumLen + 1) + newVerseUsfm
                const newChapter = verseChunks.join('\\v ')
                chapterChunks[chapterIndex] = newChapter
                newUsfm = chapterChunks.join('\\c ')
              }
            }
          }

          if (updatedVerseObjects && !newUsfm) {
            let targetVerseObjects_ = null

            if (ref) {
              if (newVerseText) {
                const { targetVerseObjects } = AlignmentHelpers.updateAlignmentsToTargetVerse(updatedVerseObjects, newVerseText)
                targetVerseObjects_ = targetVerseObjects
              } else {
                targetVerseObjects_ = updatedVerseObjects
              }
            }

            const newBookJson = targetVerseObjects_ && scriptureConfig?.updateVerse(ref.chapter, ref.verse, { verseObjects: targetVerseObjects_ })
            updatedBibleUsfm = usfmjs.toUSFM(newBookJson, { forcedNewLines: true })
          }
        }
      }

      console.log(`saveChangesToCloud() - saving new USFM: ${updatedBibleUsfm.substring(0, 100)}...`)
      setState({ saveContent: updatedBibleUsfm, startSave: true })
    }
  }

  // const checkingState = aligned ? 'valid' : 'invalid'
  // const titleText = checkingState === 'valid' ? 'Alignment is Valid' : 'Alignment is Invalid'
  // const onRenderToolbar = ({ items }) => [
  //   ...items,
  //   <IconButton
  //     className={classes.margin}
  //     key='checking-button'
  //     onClick={() => handleAlignmentClick()}
  //     title={titleText}
  //     aria-label={titleText}
  //     style={{ cursor: 'pointer' }}
  //   >
  //     {checkingState === 'valid' ? (
  //       <RxLink2 id='valid_icon' color='#BBB' />
  //     ) : (
  //       <RxLinkBreak2 id='invalid_icon' color='#000' />
  //     )}
  //   </IconButton>,
  // ]

  React.useEffect(() => {
    // check for verse range
    const _verse = reference.verse

    if (addVerseRange && (typeof _verse === 'string')) {
      // @ts-ignore
      if (_verse.includes('-')) {
        addVerseRange(`${scriptureConfig?.reference?.chapter}:${_verse}`)
      }
    }
  }, [reference.verse])


  const renderedScripturePanes = scriptureConfig?.versesForRef?.map((currentVerseData_, index) => {
    const initialVerseObjects = currentVerseData_?.verseData?.verseObjects || null
    const _scriptureAlignmentEditConfig = {
      ...scriptureAlignmentEditConfig,
      currentIndex: index,
      initialVerseObjects,
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
        reference={{ ...reference, verse }}
        saving={startSave}
        // @ts-ignore
        scriptureAlignmentEditConfig={_scriptureAlignmentEditConfig}
        server={server}
        translate={translate}
      />
    )
  })

  return (
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
      saved={startSave || !Object.keys(unsavedChanges).length}
      onSaveEdit={saveChangesToCloud}
    >
      <div id="scripture-pane-list">
        {renderedScripturePanes}
      </div>
    </Card>
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
}
