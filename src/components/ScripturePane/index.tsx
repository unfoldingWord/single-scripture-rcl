import * as React from 'react';
import { useScripture } from '../../hooks';
import {
  ScriptureReference, ServerConfig, ScriptureResource,
} from '../../types';
import {
  Container, Title, Content,
} from './styled';

interface Props {
  reference: ScriptureReference;
  resourceLink: string;
  config: ServerConfig;
  resource: ScriptureResource;
}

function ScripturePane({
  reference, resourceLink: _resourceLink, config, resource,
}: Props) {
  let resourceLink = _resourceLink;

  if (resource) {
    const {
      owner, languageId, projectId, branch = 'master',
    } = resource || {};
    resourceLink = `${owner}/${languageId}/${projectId}/${branch}`;
  }

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