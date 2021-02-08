import * as React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
`;

function Row({ children }: {children: React.ReactChild[]}) {
  return (
    <Container>
      {children}
    </Container>
  );
}
export default Row;
