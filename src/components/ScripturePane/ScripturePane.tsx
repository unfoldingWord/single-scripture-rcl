import * as React from 'react'
import { ScriptureReference } from '../../types'
import {
  Container, Title, Content,
} from './styled'

interface Props {
  /** SP content **/
  content: string;
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
}

function ScripturePane(
  {
    content,
    title,
    version,
    reference,
    refStyle,
    contentStyle,
    direction,
  }: Props) {
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
    <Container dir={direction}>
      <Title style={{ marginBottom: 12 }}>{title} v{version}</Title>
      <Content>
        <span style={refStyle}> {chapter}:{verse}&nbsp;</span>
        <span style={contentStyle}>{content}</span>
      </Content>
    </Container>
  )
}

export default ScripturePane
