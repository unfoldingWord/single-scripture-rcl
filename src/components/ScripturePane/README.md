```js
import { useState } from "react";
import { Card, useCardState } from "translation-helps-rcl";
import { makeStyles } from "@material-ui/core/styles";
import { ScripturePane, useScripture } from "../..";
import { core, SelectionsContextProvider } from "scripture-resources-rcl";
// for testing NT book

const EnglishUSTExample = {
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
  direction: "ltr",
};

const EnglishExample = {
  reference: {
    projectId: "tit",
    chapter: 1,
    verse: 5,
  },
  resource: {
    owner: "unfoldingWord",
    languageId: "en",
    projectId: "ult",
  },
  direction: "ltr",
};

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
  direction: "rtl",
};

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
  direction: "ltr",
};

///////////////////////////////////////////
// Enable one of the following bible config lines to see various examples

// const hebrewScripture = HebrewExample;
const greekScripture = GreekExample;
const englishScripture = EnglishExample;
const englishUstScripture = EnglishUSTExample;

///////////////////////////////////////////

const config = {
  server: "https://git.door43.org",
  cache: { maxAge: 1 * 1 * 1 * 60 * 1000 },
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
  const [selections, setSelections] = useState([]);
  const classes = useStyles();
  const items = null;
  const {
    state: { item, headers, filters, fontSize, itemIndex, markdownView },
    actions: { setFilters, setFontSize, setItemIndex, setMarkdownView },
  } = useCardState({
    items,
  });

  const greekScriptureConfig = useScripture({
    ...greekScripture,
    config,
  });

  const englishScriptureConfig = useScripture({
    ...englishScripture,
    config,
  });

  const refStyle = {
    fontFamily: "Noto Sans",
    fontSize: `${Math.round(fontSize * 0.9)}%`,
  };

  const contentStyle = {
    fontFamily: "Noto Sans",
    fontSize: `${fontSize}%`,
  };

  return (
    <div style={{ display: "flex" }}>
      <SelectionsContextProvider
        quote={"χάριν"}
        occurrence={1}
        selections={selections}
        verseObjects={greekScriptureConfig.verseObjects}
        onSelections={setSelections}
      >
        <Card
          title="Scripture"
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
          hideMarkdownToggle
        >
          <ScripturePane
            refStyle={refStyle}
            {...greekScriptureConfig}
            contentStyle={contentStyle}
            direction={greekScripture.direction}
          />
        </Card>
        <Card
          title="Scripture"
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
          hideMarkdownToggle
        >
          <ScripturePane
            disableWordPopover
            refStyle={refStyle}
            {...englishScriptureConfig}
            contentStyle={contentStyle}
            direction={englishScripture.direction}
          />
        </Card>
      </SelectionsContextProvider>
    </div>
  );
}

<Component />;
```
