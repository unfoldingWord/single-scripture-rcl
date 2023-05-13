import * as React from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { VerseObjects } from 'scripture-resources-rcl'
import { UsfmFileConversionHelpers } from 'word-aligner-rcl'
import { ScriptureReference } from '../../types'
import { getResourceMessage, LOADING_RESOURCE } from '../../utils'
import { ScriptureALignmentEditProps, useScriptureAlignmentEdit } from "../../hooks/useScriptureAlignmentEdit";
import { Container, Content } from './styled'

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
  originalScriptureBookObjects: object,
  /** current reference **/
  reference: ScriptureReference;
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
  setSavedChanges,
  setWordAlignerStatus,
  server,
  translate,
  updateVersesAlignmentStatus,
} : Props) {
  const [state, setState_] = React.useState({
    doingAlignment: false,
    newText: null,
    urlError: null,
  })
  const {
    doingAlignment,
    newText,
    urlError,
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  const [initialVerseText, setInitialVerseText] = React.useState(null)

  let resourceMsg = null

  if (saving) {
    resourceMsg = 'Saving Changes...'
  } else if (determiningBranch) {
    resourceMsg = 'Pre-' + LOADING_RESOURCE
  } else {
    resourceMsg = getResourceMessage(resourceStatus, server, resourceLink, isNT)
  }

  const {
    chapter,
    verse,
    projectId,
  } = reference
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

  React.useEffect(() => {
    console.log(`ScripturePane: determiningBranch is ${determiningBranch}`, { reference, resourceLink })
  }, [determiningBranch])

  const _scriptureAlignmentEdit = useScriptureAlignmentEdit(_scriptureAlignmentEditConfig)
  const {
    actions: {
      handleAlignmentClick,
      setEditing,
      setVerseChanged,
    },
    state: {
      aligned,
      alignerData,
      currentVerseObjects,
      initialVerseObjects,
      editing,
      unsavedChanges,
      newVerseText,
    },
  } = _scriptureAlignmentEdit

  if (isVerseSelectedForAlignment && !alignerData && !doingAlignment) {
    handleAlignmentClick()
  }

  React.useEffect(() => {
    updateVersesAlignmentStatus(reference, aligned)
  }, [aligned, chapter, verse, projectId])

  React.useEffect(() => {
    if (alignerData && !doingAlignment) {
      setWordAlignerStatus && setWordAlignerStatus(_scriptureAlignmentEdit)
      setState({ doingAlignment: true })
    } else if (doingAlignment) {
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
    setInitialVerseText(verseText)
  }, [{ reference, initialVerseObjects }])

  function onTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVerseText = event?.target?.value
    const changed = newVerseText !== initialVerseText
    // console.log(`SP.onTextChange`, { changed, newText: newVerseText, initialVerseText })
    setVerseChanged(changed, newVerseText, initialVerseText)
    setState({ newText: newVerseText })
  }

  function onBlur(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditing(false, newText)
  }

  return (
    <Container style={{ direction, width: '100%', paddingBottom: '0.5em' }}>
      {resourceMsg ?
        // @ts-ignore
        <div style={MessageStyle}>
          <div style={{ fontSize: `${fontSize}%` }}> {resourceMsg} </div>
        </div>
        :
        <Content>
          <span style={refStyle}> {chapter}:{verse}&nbsp;</span>
          <span style={contentStyle} onClick={() => {
            setEditing && setEditing(true)
          }}
          >
            {editing ?
              <textarea
                defaultValue={newVerseText || initialVerseText}
                onChange={onTextChange}
                onBlur={onBlur}
                style={textAreaStyle}
                autoFocus
              />
              :
              <VerseObjects
                verseKey={`${reference.chapter}:${reference.verse}`}
                verseObjects={currentVerseObjects || initialVerseObjects}
                disableWordPopover={disableWordPopover}
                getLexiconData={getLexiconData}
                translate={translate}
              />
            }
          </span>
        </Content>
      }
    </Container>
  )
}

ScripturePane.defaultProps = { verseObjects: [] }

export default ScripturePane
