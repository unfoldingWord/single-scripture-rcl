import * as React from 'react'
import { VerseObjects } from 'scripture-resources-rcl'
import {
  ScriptureReference, VerseObjectsType, VerseArrayPartsType 
} from '../../types'
import { getResourceMessage } from '../../utils'
import { Container, Content } from './styled'

interface Props {
  /** current reference - in case verseObjects (single verse) is used **/
  reference?: ScriptureReference;
  /** optional styles to use for reference **/
  refStyle: any;
  /** optional styles to use for content **/
  contentStyle: any;
  /** language direction to use **/
  direction: string|undefined;
  /** use either verseObjects (single verse) or verseObjectsArray (multiple verses) **/
  /** verseObjects **/
  verseObjects?: VerseObjectsType|undefined;
 /** verseObjectsArray **/
  verseObjectsArray?: VerseArrayPartsType[]|undefined;
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


function ScripturePane({
  reference,
  refStyle,
  direction,
  contentStyle,
  verseObjects,
  verseObjectsArray,
  disableWordPopover,
  resourceStatus,
  resourceLink,
  server,
  isNT,
  fontSize,
  getLexiconData,
  translate,
} : Props) {
  const resourceMsg = getResourceMessage(resourceStatus, server, resourceLink, isNT)
  const verse = reference && reference.verse
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
    <Container
      style={{
        direction, width: '100%', height: '100%' 
      }}
    >
      {resourceMsg ?
        // @ts-ignore
        <div style={MessageStyle}>
          <div style={{ fontSize: `${fontSize}%` }}> {resourceMsg} </div>
        </div>
        :
        <Content>
          {verseObjectsArray
            && (verseObjectsArray.length>0)
            && verseObjectsArray.map((vObj: any, inx: number) => (
              <div key={inx}>
                <span style={refStyle}> {vObj.chapter}:{vObj.verse}&nbsp;</span>
                <span style={contentStyle}>
                  <VerseObjects
                    verseObjects={vObj.verseObjects}
                    disableWordPopover={disableWordPopover}
                    getLexiconData={getLexiconData}
                    translate={translate}
                  />
                </span>
              </div>
            ))}

          {verseObjects && (
            <div>
              <span style={refStyle}> {verse}&nbsp;</span>
              <span style={contentStyle}>
                <VerseObjects
                  verseObjects={verseObjects}
                  disableWordPopover={disableWordPopover}
                  getLexiconData={getLexiconData}
                  translate={translate}
                />
              </span>
            </div>
          )}
        </Content>
      }
    </Container>
  )
}

ScripturePane.defaultProps = { verseObjects: [] }

export default ScripturePane
