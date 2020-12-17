```js
import { Card } from "translation-helps-rcl";
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
  projectId: "ult",
};

<Card title="Scripture">
  <ScripturePane config={config} resource={resource} reference={reference} />
</Card>;
```
