```js
import { Card } from "translation-helps-rcl";
import { makeStyles } from "@material-ui/core/styles";
import { ScripturePane } from "..";
// import { Row } from ".";

const reference = {
  projectId: "tit",
  chapter: 1,
  verse: 1,
};
// const resourceLink = "unfoldingWord/en/ult/master";
const config = {
  server: "https://git.door43.org",
  cache: { maxAge: 1 * 1 * 1 * 60 * 1000 },
};
const resource = {
  owner: "unfoldingWord",
  languageId: "en",
  projectId: "ust",
};
const useStyles = makeStyles({
  header: {
    fontFamily: "Noto Sans",
    fontSize: 12,
  },
  children: {
    display: "flex",
  },
});
const classes = useStyles();

<Row classes={classes}>
  <ScripturePane config={config} resource={resource} reference={reference} />
  <ScripturePane config={config} resource={resource} reference={reference} />
  <ScripturePane config={config} resource={resource} reference={reference} />
</Row>;
```
