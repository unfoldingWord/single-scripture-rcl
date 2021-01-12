```js
import { Card } from "translation-helps-rcl";
import { makeStyles } from "@material-ui/core/styles";
import { ScripturePane } from "..";
// import { Row } from ".";

const reference = {
  bookId: "tit",
  chapter: 1,
  verse: 1,
};
const config = {
  server: "https://git.door43.org",
  cache: { maxAge: 1 * 1 * 1 * 60 * 1000 },
};

const resources = [
  {
    owner: "unfoldingWord",
    languageId: "en",
    projectId: "ult",
  },
  {
    owner: "unfoldingWord",
    languageId: "el-x-koine",
    projectId: "ugnt",
  },
  {
    owner: "unfoldingWord",
    languageId: "en",
    projectId: "ust",
  },
];

<ScripturesPane config={config} resources={resources} reference={reference} />
```
