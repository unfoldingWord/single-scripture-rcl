```js
import { useState } from 'react'
import { SelectionsContextProvider } from "scripture-resources-rcl";
import { Card, useCardState } from "translation-helps-rcl";
import { makeStyles } from "@material-ui/core/styles";
import {
  ScriptureCard,
  ORIGINAL_SOURCE,
  TARGET_LITERAL
} from "../.."
import { useScripture } from '../../hooks'

// for testing NT book

const EnglishExample = {
  reference: {
    projectId: "tit",
    chapter: 1,
    verse: 5,
  },
  isNT: () => true,
  resource: {
    owner: "unfoldingWord",
    originalLanguageOwner: "unfoldingWord",
    languageId: "en",
    resourceId: TARGET_LITERAL
  },
  getLanguage: () => ({ direction: 'ltr'}),
}

const HebrewExample = {
  reference: {
    projectId: "psa",
    chapter: 119,
    verse: 166,
  },
  isNT: () => false,
  resource: {
    owner: "unfoldingWord",
    originalLanguageOwner: "unfoldingWord",
    languageId: "hbo",
    resourceId: ORIGINAL_SOURCE
  },
  getLanguage: () => ({ direction: 'rtl'}),
}

const GreekExample = {
  reference: {
    projectId: "tit",
    chapter: 1,
    verse: 5,
  },
  isNT: () => true,
  resource: {
    owner: "unfoldingWord",
    originalLanguageOwner: "unfoldingWord",
    languageId: "el-x-koine",
    resourceId: ORIGINAL_SOURCE
  },
  getLanguage: () => ({ direction: 'ltr'}),
}

const EnglishUSTExample = {
  reference: {
    projectId: "tit",
    chapter: 1,
    verse: 5,
  },
  isNT: () => true,
  resource: {
    languageId: "en",
    projectId: "ust",
    resourceId: "ust",
    owner: "unfoldingWord",
    originalLanguageOwner: "unfoldingWord",
  },
  getLanguage: () => ({ direction: 'ltr'}),
};

const greekScripture = GreekExample;
const hebrewScripture = HebrewExample;
const englishScripture = EnglishExample;
const englishUstScripture = EnglishUSTExample;

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

function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // If error also return initialValue
      console.log(`useLocalStorage(${key}) - init error:'`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = value => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to local storage
      let valueJSON = JSON.stringify(valueToStore)
      localStorage.setItem(key, valueJSON)
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(`useLocalStorage.setValue(${key}) - error:'`, error)
    }
  }

  return [storedValue, setValue]
}

function Component() {
  const [selections, setSelections] = useState([]);
  const classes = useStyles();

  const greekScriptureConfig = useScripture({
    ...greekScripture,
     resource: {
       ...greekScripture.resource,
       resourceId: 'ugnt',
       projectId: 'ugnt',
     },
    config,
  });

  return (
    <div style={{ display: "flex" }}>
      <SelectionsContextProvider
        quote={"χάριν"}
        occurrence={1}
        selections={selections}
        verseObjects={greekScriptureConfig.verseObjects || []}
        onSelections={setSelections}
      >
        <ScriptureCard
          cardNum={0}
          title='Scripture'
          classes={classes}
          server={config.server}
          branch={config.branch}
          useLocalStorage={useLocalStorage}
          {...greekScripture}
        />
        <ScriptureCard
          cardNum={1}
          title='Scripture'
          classes={classes}
          server={config.server}
          branch={config.branch}
          disableWordPopover={true}
          useLocalStorage={useLocalStorage}
          {...englishScripture}
        />
        <ScriptureCard
          cardNum={2}
          title='Scripture'
          classes={classes}
          server={config.server}
          branch={config.branch}
          disableWordPopover={true}
          useLocalStorage={useLocalStorage}
          {...englishUstScripture}
        />
      </SelectionsContextProvider>
    </div>
  );
}

<Component />;
```
