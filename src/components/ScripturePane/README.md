```js
import { useState } from 'react'
import { Card, useCardState } from "translation-helps-rcl";
import { makeStyles } from "@material-ui/core/styles";
import { ScripturePane, useScripture } from "../.."

// for testing NT book

const EnglishExample = {
  reference: {
    bookId: "tit",
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
    bookId: "psa",
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
    bookId: "tit",
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

  const [editing, setEditing] = useState(false)

  const scriptureConfig = useScripture({
    ...scripture,
    config,
    readyForFetch: true,
  });

  const refStyle = {
    fontFamily: "Noto Sans",
    fontSize: `${Math.round(fontSize * 0.9)}%`,
  }

  const contentStyle = {
    fontFamily: "Noto Sans",
    fontSize: `${fontSize}%`,
  }

  function setEditing_(state) {
    console.log(`setEditing(${state})`)
    setEditing(state)
  }

  const { chapter, verse } = scripture.reference
  var bookObjects = scriptureConfig && scriptureConfig.bookObjects;
  let initialVerseObjects = bookObjects && bookObjects.chapters && bookObjects.chapters[chapter] && bookObjects.chapters[chapter][verse];
  initialVerseObjects = initialVerseObjects && initialVerseObjects.verseObjects || []
  const scriptureAlignmentEditConfig = {
    initialVerseObjects
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
        editing={editing}
        setEditing={setEditing_}
        scriptureAlignmentEditConfig={scriptureAlignmentEditConfig}
      />
    </Card>
  );
}

<Component />;
```
