import * as React from 'react'
import { VerseObjects } from 'scripture-resources-rcl'
import { ScriptureReference, VerseObjectsType } from '../../types'
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
  /** if defined then there was an error fetching resource */
  resourceLink: string|undefined;
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
} : Props) {
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

  console.log(`getting ${resourceLink}:`)
  let errorMsg

  if (error) {
    console.log(`Resource Error: ${JSON.stringify(error)}`)

    if (error['manifestNotFound']) {
      errorMsg = `Project manifest not found`
    } else if (error['invalidManifest']) {
      errorMsg = `Project manifest not valid`
    } else if (error['contentNotFound']) {
      errorMsg = `Book not found in Project`
    } else if (error['scriptureNotLoaded']) {
      errorMsg = `Scripture Verse not Translated`
    }
  } else {
    console.log(`Valid Resource`)
  }


  return (
    <Container dir={direction}>
      <Content>
        <span style={refStyle}> {chapter}:{verse}&nbsp;</span>
        <span style={contentStyle}>
          { errorMsg ||
            <VerseObjects verseObjects={verseObjects} disableWordPopover={disableWordPopover} />
          }
        </span>
      </Content>
    </Container>
  )
}

ScripturePane.defaultProps = { verseObjects: [] }

export default ScripturePane
