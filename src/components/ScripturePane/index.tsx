import * as React from 'react';
import { useScripture } from '../../hooks';
import { ScriptureReference, ServerConfig } from '../../types';
import {
  Container, Title, Content,
} from './styled';

interface Props {
  reference: ScriptureReference;
  resourceLink: string;
  config: ServerConfig;
}

function ScripturePane({
  reference, resourceLink, config,
}: Props) {
  const { chapter, verse } = reference;
  const { content, title } = useScripture({
    reference, resourceLink, config,
  });
  return (
    <Container>
      <Title style={{ marginBottom: 12 }}>{title}</Title>
      <Content>
        {chapter}:{verse}&nbsp;{content}
      </Content>
    </Container>
  );
}

export default ScripturePane;