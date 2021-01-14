import * as React from 'react';
import { ScriptureReference } from '../../types';
import {
  Container, Title, Content,
} from './styled';

interface Props {
    content: string;
    title: string;
    version: string;
    reference: ScriptureReference;
    refStyle: any;
    contentStyle: any;
}

function ScripturePane(
  {
    content,
    title,
    version,
    reference,
    refStyle,
    contentStyle,
  }: Props) {
  const { chapter, verse } = reference;

  refStyle = refStyle || {
    fontFamily: 'Noto Sans',
    fontSize: '90%',
  };

  contentStyle = contentStyle || {
    fontFamily: 'Noto Sans',
    fontSize: '100%',
  };

  return (
    <Container>
      <Title style={{ marginBottom: 12 }}>{title} v{version}</Title>
      <Content>
        <span style={refStyle}> {chapter}:{verse}&nbsp;</span>
        <span style={contentStyle}>{content}</span>
      </Content>
    </Container>
  );
}

export default ScripturePane;
