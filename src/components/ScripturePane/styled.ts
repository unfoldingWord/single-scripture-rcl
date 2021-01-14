import styled from 'styled-components';

export const Container = styled.div`
padding: 0 .5em;
@font-face {
  font-family: "Noto Sans";
  font-weight: 300;
  src: url("../../../static/NotoSans-Regular.ttf");
}

@font-face {
  font-family: "Noto Sans";
  font-weight: 600;
  src: url("../../../static/NotoSans-Bold.ttf");
}

`;
export const Title = styled.div`
  max-width: 50%;
  font-family: Noto Sans;
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  letter-spacing: 0ch;
  line-height: 14px;
`;

export const Content = styled.span`
  font-size: 16px;
  letter-spacing: 0.25px;
  font-family: Noto Sans;
  font-weight: normal;
  line-height: 20px;
`;

export const ChapterVerse = styled.span`
  font-size: 12px;
`;
