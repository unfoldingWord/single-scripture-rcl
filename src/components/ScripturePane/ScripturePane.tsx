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
}

function ScripturePane({ content, title, version, reference }: Props) {
  const { chapter, verse } = reference;

  return (
    <Container>
      <Title style={{ marginBottom: 12 }}>{title} v{version}</Title>
      <Content>
        {chapter}:{verse}&nbsp;{content}
      </Content>
    </Container>
  );
}

export default ScripturePane;
