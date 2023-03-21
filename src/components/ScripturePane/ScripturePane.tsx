import * as React from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { VerseObjects } from 'scripture-resources-rcl'
import { UsfmFileConversionHelpers } from 'word-aligner-rcl'
import { ScriptureReference, VerseObjectsType } from '../../types'
import { getResourceMessage } from '../../utils'
import { Container, Content } from './styled'

interface Props {
  /** current reference **/
  reference: ScriptureReference;
  /** optional styles to use for reference **/
  refStyle: any;
  /** optional styles to use for content **/
  contentStyle: any;
  /** language direction to use **/
  direction: string|undefined;
  /** verseObjects **/
  verseObjects: VerseObjectsType|undefined;
  /** if true then do not display lexicon popover on hover **/
  disableWordPopover: boolean|undefined;
  /** object that contains resource loading status or fetching errors */
  resourceStatus: object|undefined;
  /** resource that was loaded */
  resourceLink: string|undefined;
  /** server */
  server: string|undefined;
  /** true if browsing NT */
  isNT: boolean;
  /** font size for messages */
  fontSize: number;
  /** function to get latest lexicon data */
  getLexiconData: Function;
  /** optional function for localization */
  translate: Function;
  /** true if in edit mode */
  editing: boolean;
  /** callback to set edit mode */
  setEditing: Function;
  /** callback to set that verse has changed */
  setVerseChanged: Function;
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
  contentStyle,
  verseObjects,
  disableWordPopover,
  resourceStatus,
  resourceLink,
  server,
  isNT,
  fontSize,
  getLexiconData,
  translate,
  editing,
  setEditing,
  setVerseChanged,
} : Props) {
  const [initialVerseText, setInitialVerseText] = React.useState(null)
  const [currentVerseText, setCurrentVerseText] = React.useState(null)
  const resourceMsg = getResourceMessage(resourceStatus, server, resourceLink, isNT)
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
    const verseText = UsfmFileConversionHelpers.getUsfmForVerseContent({ verseObjects })
    setInitialVerseText(verseText)
  }, [{ verseObjects }])

  function onTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    // console.log(`onTextChange`, event)
    const newText = event?.target?.value
    const changed = newText !== initialVerseText
    setVerseChanged(changed, newText, initialVerseText)
    setCurrentVerseText(newText)
    // console.log(`onTextChange: new text ${changed ? 'changed' : 'unchanged'}: `, newText)
  }

  function onBlur(event: React.ChangeEvent<HTMLTextAreaElement>) {
    // console.log(`onTextChange`, event)
    setEditing(false)
  }

  return (
    <Container style={{ direction, width: '100%', height: '100%' }}>
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
                defaultValue={initialVerseText}
                onChange={onTextChange}
                onBlur={onBlur}
                style={textAreaStyle}
                autoFocus
              />
              :
              <VerseObjects
                verseObjects={verseObjects}
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
