```js
import { Card, useCardState } from "translation-helps-rcl";
import { makeStyles } from "@material-ui/core/styles";
import { ScripturePane, useScripture } from "../.."

// for testing NT book

const EnglishExample = {
  reference: {
    projectId: "tit",
    chapter: 1,
    verse: 5,
  },
  resource: {
    owner: "unfoldingWord",
    languageId: "en",
    projectId: "ust",
  },
  direction: 'ltr',
  disableWordPopover: true,
}

const HebrewExample = {
  reference: {
    projectId: "psa",
    chapter: 119,
    verse: 166,
  },
  resource: {
    owner: "unfoldingWord",
    languageId: "hbo",
    projectId: "uhb",
  },
  direction: 'rtl',
  disableWordPopover: false,
}

const GreekExample = {
  reference: {
    projectId: "tit",
    chapter: 1,
    verse: 5,
  },
  resource: {
    owner: "unfoldingWord",
    languageId: "el-x-koine",
    projectId: "ugnt",
  },
  direction: 'ltr',
  disableWordPopover: false,
}

///////////////////////////////////////////
// enable one of the following bible config lines to see various examples

const scripture = HebrewExample;
// const scripture = GreekExample;
// const scripture = EnglishExample;

///////////////////////////////////////////

const config = {
  server: "https://git.door43.org",
  cache: { maxAge: 1 * 1 * 1 * 60 * 1000 },
  branch: 'master',
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

function Component() {
  const classes = useStyles();
  const items = null;
  const {
    state: { item, headers, filters, fontSize, itemIndex, markdownView },
    actions: { setFilters, setFontSize, setItemIndex, setMarkdownView },
  } = useCardState({
    items,
  })

  const scriptureConfig = useScripture({
    ...scripture, config
  });

  const refStyle = {
    fontFamily: "Noto Sans",
    fontSize: `${Math.round(fontSize * 0.9)}%`,
  }

  const contentStyle = {
    fontFamily: "Noto Sans",
    fontSize: `${fontSize}%`,
  }

  return (
    <Card
      items={items}
      classes={classes}
      headers={headers}
      filters={filters}
      fontSize={fontSize}
      itemIndex={itemIndex}
      setFilters={setFilters}
      setFontSize={setFontSize}
      setItemIndex={setItemIndex}
      markdownView={markdownView}
      setMarkdownView={setMarkdownView}
      title="Scripture"
    >
      <ScripturePane
        refStyle={refStyle}
        contentStyle={contentStyle}
        {...scriptureConfig}
        direction={scripture.direction}
        server={config.server}
      />
    </Card>
  );
}

<Component />;
```
