import * as React from 'react';
import { useScripture } from '../../hooks';
import { ScriptureReference, ServerConfig } from '../../types';

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
    <>
      <div>{chapter}</div>
      <div>{verse}</div>
      <div>{title}</div>
      <div>{content}</div>
    </>
  );
}

export default ScripturePane;