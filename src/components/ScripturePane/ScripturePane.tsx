import * as React from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { VerseObjects } from 'scripture-resources-rcl'
import { UsfmFileConversionHelpers } from 'word-aligner-rcl'
import { CircularProgress } from 'translation-helps-rcl'
import { BookObjectsType, ScriptureReferenceType } from '../../types'
import {
  delay,
  getResourceMessage,
  LOADING_RESOURCE,
  verseObjectsHaveWords,
} from '../../utils'
import { ScriptureALignmentEditProps, useScriptureAlignmentEdit } from '../../hooks/useScriptureAlignmentEdit'
import {
  Container,
  Content,
  EmptyContent,
} from './styled'

interface Props {
  /** optional styles to use for content **/
  contentStyle: any;
  // index number for this scripture pane
  currentIndex: number,
  // waiting to determine branch
  determiningBranch: boolean,
  /** language direction to use **/
  direction: string|undefined;
  /** if true then do not display lexicon popover on hover **/
  disableWordPopover: boolean|undefined;
  /** font size for messages */
  fontSize: number;
  /** function to get latest lexicon data */
  getLexiconData: Function;
  /** true if browsing NT */
  isNT: boolean;
  /** whether or not this current verse has been selected for alignment */
  isVerseSelectedForAlignment: boolean;
  /** function to be called when verse alignment has finished */
  onAlignmentFinish: Function;
  // original scripture bookObjects for current book
  originalScriptureBookObjects: BookObjectsType,
  /** current reference **/
  reference: ScriptureReferenceType;
  /** optional styles to use for reference **/
  refStyle: any;
  /** object that contains resource loading status or fetching errors */
  resourceStatus: object|undefined;
  /** resource that was loaded */
  resourceLink: string|undefined;
  /** true if currently saving updated text and alignments */
  saving: boolean;
  // initialization for useScriptureAlignmentEdit
  scriptureAlignmentEditConfig: ScriptureALignmentEditProps,
  /** server */
  server: string|undefined;
  /** callback to flag that we are editing */
  setEditVerse: Function;
  /** callback to flag unsaved status */
  setSavedChanges: Function;
  // callback for change in word alignment status
  setWordAlignerStatus: Function;
  /** optional function for localization */
  translate: Function;
  /** function to be called to update verse alignment status */
  updateVersesAlignmentStatus: Function;
}

const MessageStyle = {
  direction: 'ltr',
  whiteSpace: 'pre-wrap',
  lineHeight: 'normal',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  width: '100%',
  fontSize: '16px',
  fontFamily: 'Noto Sans',
  fontWeight: 'bold',
}

const TextAreaStyle = {
  height: '60%',
  width: '100%',
  minWidth: '220px',
  minHeight: '100px',
  fontSize: '16px',
}

function ScripturePane({
  currentIndex,
  contentStyle,
  determiningBranch,
  direction,
  disableWordPopover,
  fontSize,
  getLexiconData,
  isNT,
  isVerseSelectedForAlignment,
  onAlignmentFinish,
  originalScriptureBookObjects,
  reference,
  refStyle,
  resourceStatus,
  resourceLink,
  saving,
  scriptureAlignmentEditConfig,
  setEditVerse,
  setSavedChanges,
  setWordAlignerStatus,
  server,
  translate,
  updateVersesAlignmentStatus,
} : Props) {
  const [state, setState_] = React.useState({
    doingAlignment: false,
    newText: null,
    processingEdit: false,
  })
  const {
    doingAlignment,
    newText,
    processingEdit, // true when we are processing edit text after onBlur
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  const [initialVerseText, setInitialVerseText] = React.useState(null)

  let resourceMessage = ''

  if (saving) {
    resourceMessage = 'Saving Changes...'
  } else if (determiningBranch) {
    resourceMessage = 'Pre-' + LOADING_RESOURCE
  } else {
    resourceMessage = getResourceMessage(resourceStatus, server, resourceLink, isNT)
  }

  const {
    chapter,
    bookId,
    verse,
  } = reference || {}
  direction = direction || 'ltr'

  refStyle = refStyle || {
    fontFamily: 'Noto Sans',
    fontSize: '90%',
  }

  contentStyle = contentStyle || {
    fontFamily: 'Noto Sans',
    fontSize: '100%',
  }

  const _scriptureAlignmentEditConfig = {
    ...scriptureAlignmentEditConfig,
    initialVerseText,
    originalScriptureBookObjects,
  }

  const _scriptureAlignmentEdit = useScriptureAlignmentEdit(_scriptureAlignmentEditConfig)
  const {
    actions: {
      clearChanges,
      handleAlignmentClick,
      setEditing,
      setVerseChanged,
    },
    state: {
      aligned,
      alignerData,
      currentVerseObjects,
      editing,
      enableEdit,
      initialVerseObjects,
      newVerseText,
    },
  } = _scriptureAlignmentEdit

  React.useEffect(() => {
    if (isVerseSelectedForAlignment && !alignerData && !doingAlignment) { // check if edit for this verse is selected and not already doing alignment
      if (!editing && !processingEdit) { // make sure edit completed
        console.log(`ScripturePane - verse selected for alignment`, reference)
        handleAlignmentClick()
      } else {
        console.log(`ScripturePane - still editing verse, not ready for alignment`, {editing, processingEdit})
      }
    }
  }, [isVerseSelectedForAlignment, alignerData, doingAlignment, editing, processingEdit])

  React.useEffect(() => {
    updateVersesAlignmentStatus && updateVersesAlignmentStatus(reference, aligned)
  }, [aligned, chapter, verse, bookId])

  React.useEffect(() => {
    if (alignerData && !doingAlignment) {
      setWordAlignerStatus && setWordAlignerStatus(_scriptureAlignmentEdit)
      setState({ doingAlignment: true })
    } else {
      if (!doingAlignment) {
        console.log(`ScripturePane - alignerData went false unexpected`, { reference, alignerData, doingAlignment })
      }

      setWordAlignerStatus && setWordAlignerStatus(_scriptureAlignmentEdit)
      setState({ doingAlignment: false })
      onAlignmentFinish && onAlignmentFinish()
    }
  }, [_scriptureAlignmentEdit?.state?.alignerData])

  // dynamically adjust font size
  const calculatedFontSize = React.useMemo(() => (
    parseFloat(TextAreaStyle.fontSize) * fontSize / 100 + 'px'
  ), [fontSize])

  const textAreaStyle = {
    ...contentStyle,
    ...TextAreaStyle,
    fontSize: calculatedFontSize,
  }

  useDeepCompareEffect(() => {
    const verseText = UsfmFileConversionHelpers.getUsfmForVerseContent({ verseObjects: initialVerseObjects })
    clearChanges()
    setInitialVerseText(verseText)
    setState({ newText: null })
  }, [{ reference, initialVerseObjects }])

  function onBlur(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVerseText = event?.target?.value // get new text
    setState({ newText: newVerseText, processingEdit: true })
    delay(500).then(() => { // allow state to update before processing new text
      setEditing(false, newVerseText).then(() => { // process the latest edit
        setState({processingEdit: false})
      })
    })
  }

  React.useEffect(() => { // monitor for edit state changes and call back to scripture card with edit status
    const _editing = editing || processingEdit
    const verseRef = `${reference.chapter}:${reference.verse}`
    setEditVerse && setEditVerse(verseRef, _editing)
  }, [editing, processingEdit])

  const verseObjects = currentVerseObjects || initialVerseObjects || []
  const noWords = React.useMemo(() => !verseObjectsHaveWords(verseObjects), [currentVerseObjects, initialVerseObjects])

  /**
   * determine what UI to show based on state
   * @param {boolean} editing - if true show edit mode
   * @param {boolean} enableEdit - if true then edit is enabled
   * @param {boolean} noWords - if true then there are no displayable words
   * @param {boolean} processingEdit - if true then edit is being processed
   */
  function verseContent(editing, enableEdit, noWords, processingEdit) {
    if (processingEdit) { // put up spinner while processing the edit
      return <CircularProgress size={40}/>
    }

    if (editing) {
      return <textarea
        defaultValue={newVerseText || initialVerseText}
        onBlur={onBlur}
        style={textAreaStyle}
        autoFocus
      />
    }

    if (noWords && enableEdit) { // show a clickable message in the case that there is no text to click on
      return <EmptyContent>
        Click to Edit
      </EmptyContent>
    }

    return <VerseObjects
      verseKey={`${reference.chapter}:${reference.verse}`}
      verseObjects={verseObjects}
      disableWordPopover={disableWordPopover}
      getLexiconData={getLexiconData}
      translate={translate}
    />
  }

  return (
    <Container style={{ direction, width: '100%', paddingBottom: '0.5em' }}>
      {resourceMessage ?
        // @ts-ignore
        <div style={MessageStyle}>
          <div style={{ fontSize: `${fontSize}%` }}> {resourceMessage} </div>
        </div>
        :
        <Content>
          <span style={refStyle}> {chapter}:{verse}&nbsp;</span>
          <span style={contentStyle} onClick={() => {
            setEditing && setEditing(true)
          }}
          >
            {verseContent(editing, enableEdit, noWords, processingEdit)}
          </span>
        </Content>
      }
    </Container>
  )
}

ScripturePane.defaultProps = { verseObjects: [] }

export default ScripturePane
