import * as React from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { VerseObjects } from 'scripture-resources-rcl'
import { UsfmFileConversionHelpers } from 'word-aligner-rcl'
import { RxLink2, RxLinkBreak2 } from 'react-icons/rx'
import { IconButton } from '@mui/material'
import { ScriptureReference } from '../../types'
import { getResourceMessage } from '../../utils'
import { ScriptureALignmentEditProps, useScriptureAlignmentEdit } from "../../hooks/useScriptureAlignmentEdit";
import { Container, Content } from './styled'

interface Props {
  /** optional styles to use for content **/
  contentStyle: any;
  // index number for this scripture pane
  currentIndex: number,
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
  /** whether or not we are currently merging changes from master */
  merging: boolean;
  /** whether or not this current verse has been selected for alignment */
  isVerseSelectedForAlignment: boolean;
  /** function to be called when verse alignment has finished */
  onAlignmentFinish: Function;
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
  reference,
  refStyle,
  direction,
  currentIndex,
  contentStyle,
  disableWordPopover,
  resourceStatus,
  resourceLink,
  server,
  isNT,
  fontSize,
  getLexiconData,
  translate,
  saving,
  scriptureAlignmentEditConfig,
  setSavedChanges,
  setWordAlignerStatus,
  merging,
  isVerseSelectedForAlignment,
  onAlignmentFinish,
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

  let resourceMessage = ''
  if (saving) {
    resourceMessage = 'Saving Changes...'
  } else if (merging) {
    resourceMessage = 'Merging Changes...'
  } else {
    resourceMessage = getResourceMessage(resourceStatus, server, resourceLink, isNT)
  }

  const { chapter, verse } = reference
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
  }

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
    console.log(`SP.onTextChange`, { changed, newText: newVerseText, initialVerseText })
    setVerseChanged(changed, newVerseText, initialVerseText)
    setState({ newText: newVerseText })
  }

  function onBlur(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditing(false, newText)
  }

  const checkingState = aligned ? 'valid' : 'invalid'
  const titleText = checkingState === 'valid' ? 'Alignment is Valid' : 'Alignment is Invalid'

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
