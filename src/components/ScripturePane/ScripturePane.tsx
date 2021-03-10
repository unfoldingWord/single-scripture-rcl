import * as React from 'react'
import { VerseObjects } from 'scripture-resources-rcl'
import { ScriptureReference, VerseObjectsType } from '../../types'
import { getErrorMessage } from '../../utils'
import { Container, Content } from './styled'

interface Props {
  /** SP title **/
  title: string;
  /** resource version **/
  version: string;
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
  /** if defined then there was an error fetching resource */
  error: object|undefined;
  /** resource that was loaded */
  resourceLink: string|undefined;
  /** server */
  server: string|undefined;
}

function ScripturePane({
  title,
  version,
  reference,
  refStyle,
  direction,
  contentStyle,
  verseObjects,
  disableWordPopover,
  error,
  resourceLink,
  server,
} : Props) {
  const errorMsg = getErrorMessage(error, server, resourceLink)
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

  return (
    <Container style={{ direction, width: '100%' }}>
      <Content>
        <span style={refStyle}> {chapter}:{verse}&nbsp;</span>
        <span style={contentStyle}>
          { errorMsg ?
            <div style={{
              direction: 'ltr',
              whiteSpace: 'pre-wrap',
              lineHeight: 'normal',
            }}
            >{errorMsg}</div>
            :
            <VerseObjects verseObjects={verseObjects} disableWordPopover={disableWordPopover} />
          }
        </span>
      </Content>
    </Container>
  )
}

ScripturePane.defaultProps = { verseObjects: [] }

export default ScripturePane
