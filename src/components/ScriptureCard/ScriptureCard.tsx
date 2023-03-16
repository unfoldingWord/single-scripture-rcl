import * as React from 'react'
import * as PropTypes from 'prop-types'
import {
  Card,
  useCardState,
  useUserBranch,
  ERROR_STATE,
  MANIFEST_NOT_LOADED_ERROR,
} from 'translation-helps-rcl'
import { WordAligner } from 'word-aligner-rcl'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import { IconButton } from '@mui/material'
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
import { useScriptureAlignmentEdit } from '../../hooks/useScriptureAlignmentEdit'

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
}) {
  const [state, setState_] = React.useState({
    currentVerseNum: 0, //TODO will be used in future when need to support multiple verses in card
    ref: appRef,
    urlError: null,
  })
  const {
    currentVerseNum,
    ref,
    urlError,
  } = state

  const [fontSize, setFontSize] = useUserLocalStorage(KEY_FONT_SIZE_BASE + cardNum, 100)

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
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

  // @ts-ignore
  const cardResourceId = scriptureConfig?.resource?.projectId || resourceId
  const currentVerseData_ = scriptureConfig?.versesForRef?.[currentVerseNum] || null
  const initialVerseObjects = currentVerseData_?.verseData?.verseObjects || null
  // @ts-ignore
  let ref_ = scriptureConfig?.resource?.ref || appRef
  const canUseEditBranch = loggedInUser && authentication &&
    (resourceId !== ORIGINAL_SOURCE) &&
    ((ref_ === 'master') || (ref_.substring(0, loggedInUser.length) === loggedInUser) ) // not tag

  const {
    state: { workingResourceBranch },
    actions: { startEdit },
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
  const reference_ = { bookId, chapter, verse }
  let scriptureTitle

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
      const message = getResourceMessage(resourceStatus, server, resourceLink, isNT(bookId))
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

  if (scriptureConfig.matchedVerse) { // support verse ranges
    reference.verse = scriptureConfig.matchedVerse
  }

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
      if (!disableWordPopover && initialVerseObjects && fetchGlossesForVerse) {
        await fetchGlossesForVerse(initialVerseObjects, languageId_)
      }
    }

    fetchGlossDataForVerse()
  }, [ initialVerseObjects, disableWordPopover, languageId_, fetchGlossesForVerse ])

  const enableEdit = !usingOriginalBible
  const enableAlignment = !usingOriginalBible
  const originalRepoUrl = isNewTestament ? greekRepoUrl : hebrewRepoUrl
  const {
    actions: {
      cancelAlignment,
      currentVerseObjects,
      handleAlignmentClick,
      onAlignmentsChange,
      saveAlignment,
      setEditing,
      setVerseChanged,
      saveEdit,
    },
    state: {
      aligned,
      alignerData,
      editing,
      saved,
    },
  } = useScriptureAlignmentEdit({
    enableEdit,
    enableAlignment,
    httpConfig,
    isNewTestament,
    originalLanguageOwner,
    originalRepoUrl,
    // @ts-ignore
    scriptureConfig,
    scriptureSettings,
    startEdit,
    initialVerseObjects,
  })

  function showPopover(PopoverTitle, wordDetails, positionCoord, rawData) {
    // TODO: make show popover pretty
    console.log(`showPopover`, rawData)
    window.prompt(`User clicked on ${JSON.stringify(rawData.token)}`)
  }

  // console.log(`${cardResourceId} saved: ${saved}`)

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
      saved={saved}
      onSaveEdit={saveEdit}
      onBlur={() => setEditing(false)}
      checkingState={aligned ? 'valid' : 'invalid'}
      onCheckingStateClick={() => handleAlignmentClick()}
    >
      {alignerData ?
        <div style={{ flexDirection: 'column' }}>
          <WordAligner
            style={{ maxHeight: '450px', overflowY: 'auto' }}
            verseAlignments={alignerData.alignments}
            targetWords={alignerData.wordBank}
            translate={translate}
            contextId={{ reference: reference_ }}
            targetLanguageFont={''}
            sourceLanguage={isNT ? NT_ORIG_LANG : OT_ORIG_LANG}
            showPopover={showPopover}
            lexicons={{}}
            loadLexiconEntry={getLexiconData}
            onChange={(results) => onAlignmentsChange(results)}
          />
          <br />
          <div style={{ width: '100%' }}>
            <IconButton
              disabled={false}
              className={classes.margin}
              key='alignment-save'
              onClick={() => saveAlignment()}
              aria-label={'Alignment Save'}
            >
              <CheckOutlinedIcon id='alignment-save-icon' htmlColor='#000' />
            </IconButton>
            <IconButton
              disabled={false}
              className={classes.margin}
              key='alignment-cancel'
              onClick={() => cancelAlignment()}
              aria-label={'Alignment Cancel'}
            >
              <CancelOutlinedIcon id='alignment-cancel-icon' htmlColor='#000' />
            </IconButton>
          </div>
        </div>
        :
        <ScripturePane
          refStyle={refStyle}
          {...scriptureConfig}
          verseObjects={currentVerseObjects}
          isNT={isNT(bookId)}
          server={server}
          reference={reference}
          direction={direction}
          contentStyle={contentStyle}
          fontSize={fontSize}
          disableWordPopover={disableWordPopover_}
          getLexiconData={getLexiconData}
          translate={translate}
          editing={editing}
          setEditing={setEditing}
          setVerseChanged={setVerseChanged}
        />
      }
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
}
