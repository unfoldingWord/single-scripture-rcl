```js
import { useState } from 'react'
import { Card, useCardState } from "translation-helps-rcl";
import { makeStyles } from "@material-ui/core/styles";
import {
  ScriptureCard,
  ORIGINAL_SOURCE,
  TARGET_LITERAL
} from "../.."

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
    languageId: "en",
    resourceId: TARGET_LITERAL
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
  isNT: () => false,
  resource: {
    owner: "unfoldingWord",
    languageId: "hbo",
    resourceId: ORIGINAL_SOURCE
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
  isNT: () => true,
  resource: {
    owner: "unfoldingWord",
    languageId: "el-x-koine",
    resourceId: ORIGINAL_SOURCE
  },
  direction: 'ltr',
  disableWordPopover: false,
}

///////////////////////////////////////////
// enable one of the following bible config lines to see various examples

// const scripture = HebrewExample;
const scripture = GreekExample;
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
  const classes = useStyles();
  const {
    reference: {
      projectId: bookId,
      chapter,
      verse,
    },
    isNT,
    resource: {
      owner,
      languageId,
      resourceId,
    },
    direction,
    disableWordPopover,
  } = scripture

  return (
    <ScriptureCard
      cardNum={0}
      title='Scripture'
      chapter={chapter}
      verse={verse}
      server={config.server}
      owner={owner}
      branch={config.branch}
      languageId={languageId}
      direction={direction}
      resourceId={resourceId}
      bookId={bookId}
      disableWordPopover={true}
      classes={classes}
      useLocalStorage={useLocalStorage}
      isNT={scripture.isNT}
    />
  );
}

<Component />;
```
