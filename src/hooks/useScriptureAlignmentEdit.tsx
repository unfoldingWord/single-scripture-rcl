// @ts-ignore
import * as React from 'react'
import {
  AlignmentHelpers,
  UsfmFileConversionHelpers,
  usfmHelpers,
} from 'word-aligner-rcl'
import { isEqual } from '@react-hookz/deep-equal'
import {
  BookObjectsType,
  ScriptureConfig,
  ScriptureReference,
  ServerConfig,
  VerseObjectsType,
} from '../types'
import { getScriptureResourceSettings, verseObjectsHaveWords } from '../utils/ScriptureSettings'
import { ORIGINAL_SOURCE } from '../utils'
import { getVersesForRef } from './useScripture'

interface StartEdit {
  (): Promise<string>;
}

type LanguageType = {
  languageId: string, // short language code such as "en"
  direction: string, // language direction "ltr" or "rtl"
};

interface AlignerDataType {
    wordBank?: Object[], // list of wordbank word (target language words) in format needed by word-aligner-rcl
    alignments?: Object[], // list of word alignments in format needed by word-aligner-rcl
    errorMessage?: string, // if present then we don't have necessary data to do alignment
}

interface AlignerResultsDataType {
    targetWords?: Object[], // list of target language words in format used in word-aligner-rcl
    verseAlignments?: Object[], // list of word alignments in format used by word-aligner-rcl
}

export interface ScriptureALignmentEditProps {
  // index to use for book (e.g. `01` for `GEN`)
  bookIndex: string,
  // current verse selected from initialVerseObjects[]
  currentIndex: number,
  // reference for verse selected for alignment
  currentVerseRef: ScriptureReference,
  // if true then editing is allowed
  enableEdit: boolean,
  // if true then alignment is allowed
  enableAlignment: boolean,
  // configuration to use for http communication
  httpConfig: ServerConfig,
  // array of the initial verseObjects for current reference
  initialVerseObjects: VerseObjectsType,
  // initial text for verse
  initialVerseText: string,
  // flag that we are working on NT book
  isNewTestament: boolean,
  // user name of logged in user
  loggedInUser: string,
  // owner to use when fetching original language resources
  originalLanguageOwner: string,
  // url for the original language repo
  originalRepoUrl: string,
  // original scripture bookObjects for current book
  originalScriptureBookObjects: BookObjectsType,
  /** current reference **/
  reference: ScriptureReference;
  // details about the current scripture loaded
  scriptureConfig: ScriptureConfig,
  // settings to be used for scripture
  scriptureSettings: { },
  // callback to save current verse edit and alignment changes
  setSavedChanges: Function,
  // source language code such as `hbo`
  sourceLanguage: string,
  // callback to create a user branch for saving edit data
  startEditBranch: StartEdit,
  // current target language
  targetLanguage: LanguageType,
  // title to show in alignment
  title: string,
   // branch name currently being used (e.g. `master` or user branch)
  workingResourceBranch: string,
}

/**
 * determines if alignment is complete based on target USFM and original language verse objects
 * @param {string} targetVerseUSFM
 * @param {VerseObjectsType} originalVerseObjects
 */
function isUsfmAligned(targetVerseUSFM, originalVerseObjects) {
  originalVerseObjects = originalVerseObjects?.length ? originalVerseObjects : null // make sure not passing empty Array
  const { alignments, wordBank } = AlignmentHelpers.extractAlignmentsFromTargetVerse(targetVerseUSFM, originalVerseObjects)
  return AlignmentHelpers.areAlgnmentsComplete(wordBank, alignments)
}

/**
 * get the updated USFM for target verse from the updated verse objects and latest text
 * @param {VerseObjectsType} updatedVerseObjects
 * @param {VerseObjectsType} initialVerseObjects
 * @param {boolean} verseTextChanged
 * @param {string} newVerseText
 */
function getCurrentVerseUsfm(updatedVerseObjects, initialVerseObjects, verseTextChanged: boolean, newVerseText) {
  let targetVerseUSFM = null
  const currentVerseObjects_ = updatedVerseObjects || initialVerseObjects

  if (verseTextChanged && newVerseText) {
    const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects_, newVerseText)
    targetVerseUSFM = targetVerseText
  } else {
    targetVerseUSFM = UsfmFileConversionHelpers.convertVerseDataToUSFM(currentVerseObjects_)
  }
  return targetVerseUSFM
}

/**
 * return true if only spaces in content
 * @param {string} text
 */
function allSpaces(text) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== ' ') {
      return false
    }
  }
  return true
}

/**
 * make sure there is a significant change to the text
 * @param {string} newVerseText
 * @param {string} initialVerseText
 */
function hasTextChangedSignificantly(newVerseText, initialVerseText) {
  let changed = newVerseText !== initialVerseText

  if (changed && newVerseText) { // make sure it's significant
    const lengthDifference = newVerseText.length - initialVerseText?.length
    const firstPartOfInitial = newVerseText.substring(0, initialVerseText.length)

    if ((lengthDifference > 0) && (initialVerseText === firstPartOfInitial)) { // if initial parts match
      // add exemption if the usfm ends with a quote tag
      const lastChars = newVerseText.substring(newVerseText.length - lengthDifference)
      const pos = newVerseText.lastIndexOf('\\')
      const lastUsfmTag = newVerseText[pos + 1]
      const endsWithQuote = (pos > 0) && (lastUsfmTag === 'q')

      if (endsWithQuote && allSpaces(lastChars)) {
        changed = false
      }
    }
  }
  return changed
}

// manage verse edit and alignment states
export function useScriptureAlignmentEdit({
  currentIndex,
  enableEdit,
  enableAlignment,
  httpConfig,
  initialVerseObjects,
  initialVerseText,
  isNewTestament,
  originalLanguageOwner,
  originalScriptureBookObjects,
  originalRepoUrl,
  reference,
  scriptureConfig,
  scriptureSettings,
  setSavedChanges,
  sourceLanguage,
  startEditBranch,
  targetLanguage,
  title,
  workingResourceBranch,
} : ScriptureALignmentEditProps) {
  type StateTypes = {
    aligned: boolean,
    alignerData: AlignerDataType,
    editing: boolean,
    newAlignments: AlignerResultsDataType,
    newVerseText: string,
    updatedVerseObjects: VerseObjectsType,
    verseTextChanged: boolean,
  }

  const [state, setState_] = React.useState({
    aligned: false,
    alignerData: null,
    editing: false,
    newAlignments: null,
    newVerseText: null,
    updatedVerseObjects: null,
    verseTextChanged: false,
  })

  const _state: StateTypes = state // Tricky: work-around for bug that standard typescript type casting does not work in .tsx files
  const {
    aligned,
    alignerData,
    editing,
    newAlignments,
    newVerseText,
    updatedVerseObjects,
    verseTextChanged,
  } = _state
  const chapter = reference?.chapter
  const verse = reference?.verse
  const projectId = reference?.projectId
  const basicReference = { // only has the three basic fields
    chapter,
    verse,
    projectId,
  }

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  function clearChanges() {
    console.log(`clearChanges() - ${JSON.stringify(basicReference)}`)
    const clearState = {
      ...state,
      alignerData: null,
      editing: false,
      newAlignments: null,
      newVerseText: null,
      updatedVerseObjects: null,
      verseTextChanged: false,
    }

    if (!isEqual(state, clearState)) {
      console.log(`clearChanges() - reference changed, reset edit/alignment state variables`)
      setState(clearState)
    }
  }

  const originalScriptureSettings_ = {
    ...scriptureSettings,
    resourceId: ORIGINAL_SOURCE,
  }

  // @ts-ignore
  httpConfig = httpConfig || {}
  const bookId = projectId
  const originalScriptureSettings = getScriptureResourceSettings(
    bookId, originalScriptureSettings_, isNewTestament, originalRepoUrl,
  )

  if (!enableAlignment) { // if not enabled, then we don't fetch resource
    originalScriptureSettings.resourceLink = null
  }

  const originalVerseObjects = React.useMemo(() => { // get the original language verseObjects
    const verseObjects = []

    if (originalScriptureBookObjects) {
      // @ts-ignore
      const verses = getVersesForRef(basicReference, originalScriptureBookObjects, originalScriptureBookObjects?.languageId)

      if (verses?.length) {
        for (const verseReference of verses) {
          const origVerseObjects = verseReference?.verseData?.verseObjects

          if (origVerseObjects) {
            Array.prototype.push.apply(verseObjects, origVerseObjects)
          }
        }
      }
    }
    return verseObjects
  }, [originalScriptureBookObjects, chapter, verse, projectId])

  React.useEffect(() => { // update alignment status when aligner is hidden
    const notEmpty = !!initialVerseObjects
    let aligned_ = false

    if (!alignerData) { // skip if aligner is being shown
      if (notEmpty) { // skip if empty
        const currentVerseObjects_ = updatedVerseObjects || initialVerseObjects

        if (!enableAlignment) {
          aligned_ = true
        } else if (newVerseText && (newVerseText !== initialVerseText)) {
          const results = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects_, newVerseText)
          aligned_ = isUsfmAligned(results?.targetVerseText, originalVerseObjects)
        } else {
          const targetVerseUSFM = UsfmFileConversionHelpers.convertVerseDataToUSFM(currentVerseObjects_)
          aligned_ = isUsfmAligned(targetVerseUSFM, originalVerseObjects)
        }
      }

      if (aligned !== aligned_) {
        setState({ aligned: aligned_ })
      }
    }
  }, [initialVerseObjects, alignerData, newVerseText, initialVerseText, enableAlignment, originalVerseObjects])

  /**
   * get changes for saving
   * @param {object} newState - optionally pass in new state (to override state)
   */
  function getChanges(newState = {}) {
    console.log(`getChanges - started ${currentIndex} - passed state`, newState)
    const _newState = {
      state,
      ...newState,
    }
    // @ts-ignore
    const {
      // @ts-ignore
      newAlignments,
      // @ts-ignore
      newVerseText,
      // @ts-ignore
      updatedVerseObjects,
      // @ts-ignore
      verseTextChanged,
    } = _newState
    let updatedVerseObjects_ = updatedVerseObjects

    if (newAlignments) { // if unsaved alignment changes, apply them
      console.log(`getChanges - applying unsaved alignments}`)
      updatedVerseObjects_ = updateVerseWithNewAlignments()
    }

    if (verseTextChanged && newVerseText) {
      console.log(`getChanges - applying new text:`, newVerseText)
      const currentVerseObjects_ = updatedVerseObjects_ || initialVerseObjects
      updatedVerseObjects_ && console.log(`getChanges - applying updated alignments`)
      const { targetVerseObjects } = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects_, newVerseText)
      updatedVerseObjects_ = targetVerseObjects
    } else { // only alignment changes to upload
      updatedVerseObjects_ && console.log(`getChanges - applying updated alignments`, { newVerseText, updatedVerseObjects_ })
      updatedVerseObjects_ = updatedVerseObjects_ || initialVerseObjects
    }

    if (updatedVerseObjects_) {
      const ref = scriptureConfig?.versesForRef?.[currentIndex]
      return {
        newVerseText,
        ref,
        updatedVerseObjects: updatedVerseObjects_,
      }
    }

    return {}
  }

  /**
   * callback for when user clicked on alignment button - will show if not already shown
   */
  async function handleAlignmentClick() {
    if (enableAlignment) {
      let _alignerData: AlignerDataType = null
      await startEditBranch()

      if (!alignerData) { // if word aligner not shown
        console.log(`handleAlignmentClick - toggle ON alignment`)
        const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, initialVerseObjects, verseTextChanged, newVerseText)
        let originalVerseUsfm = null

        if (originalVerseObjects) {
          originalVerseUsfm = UsfmFileConversionHelpers.convertVerseDataToUSFM(originalVerseObjects)
        }

        const {
          targetWords: wordBank,
          verseAlignments: alignments,
        } = AlignmentHelpers.parseUsfmToWordAlignerData(targetVerseUSFM, originalVerseUsfm)
        _alignerData = { wordBank, alignments }

        if (!alignments?.length) {
          _alignerData.errorMessage = 'There are no words to align in the Original language'
        } else if (!wordBank?.length) {
          _alignerData.errorMessage = 'There are no words to align in the Literal/Simplified Scripture Text'
        }
      } else { // word aligner currently shown
        console.log(`handleAlignmentClick - alignment already shown`)
        _alignerData = alignerData
      }
      setState({ alignerData: _alignerData })
      console.log(_alignerData)
    }
  }

  /**
   * get updated verse objects after alignments changed
   * @param {AlignerResultsDataType} _newAlignments - results of aligner
   */
  function updateVerseWithNewAlignments(_newAlignments: AlignerResultsDataType = newAlignments) {
    const currentVerseObjects_ = updatedVerseObjects || initialVerseObjects
    const targetVerseText = newVerseText || UsfmFileConversionHelpers.convertVerseDataToUSFM(currentVerseObjects_)
    const verseUsfm = AlignmentHelpers.addAlignmentsToVerseUSFM(_newAlignments.targetWords, _newAlignments.verseAlignments, targetVerseText)
    const alignedVerseObjects = usfmHelpers.usfmVerseToJson(verseUsfm)
    return alignedVerseObjects
  }

  /**
   * callback for when user clicked on button to save current alignments in word aligner.  Generates new verse content and saves in state. Closes aligner display
   * @param {AlignerResultsDataType} _newAlignments - results of aligner
   */
  function saveAlignment(_newAlignments: AlignerResultsDataType = newAlignments) {
    console.log(`saveAlignment() - newAlignments`, _newAlignments)

    if (_newAlignments) {
      const alignedVerseObjects = updateVerseWithNewAlignments(_newAlignments)
      console.log(`saveAlignment() - alignedVerseObjects`, alignedVerseObjects)
      const newState = {
        alignerData: null,
        editing: false,
        newAlignments: null,
        updatedVerseObjects: alignedVerseObjects,
      }
      setState(newState)
      callSetSavedState(true, newState )
    } else {
      console.log(`saveAlignment() - no alignment changes`)
      setState({
        alignerData: null,
        editing: false,
      })
    }
  }

  /**
   * callback for when user clicked on button to cancel work in word aligner.  Calculates and displays current alignment valid state. Closes aligner display
   */
  function cancelAlignment() {
    console.log(`cancelAlignment()`)
    const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, initialVerseObjects, verseTextChanged, newVerseText)
    const aligned = isUsfmAligned(targetVerseUSFM, originalVerseObjects)
    setState({ alignerData: null, aligned })
  }

  /**
   * callback for button to set editing state
   * @param {boolean} editing_ - if true, editor is shown, otherwise editor is hidden
   * @param {string} _newVerseText - optional verse text
   */
  // eslint-disable-next-line require-await
  async function setEditing(editing_: boolean, _newVerseText: string = newVerseText) {
    if (enableEdit) {
      if (editing_ !== editing) {
        _newVerseText = _newVerseText || initialVerseText
        let _updatedVerseObjects = updatedVerseObjects
        const verseTextChanged = _newVerseText !== initialVerseText
        const newState = {
          editing: editing_,
          newVerseText: _newVerseText,
          verseTextChanged,
        }

        if (!verseTextChanged) {
          // fallback to make sure text from verseObjects matches current text
          const verseText = UsfmFileConversionHelpers.getUsfmForVerseContent({ verseObjects: currentVerseObjects } )

          if (hasTextChangedSignificantly(verseText, _newVerseText)) {
            // apply alignment to current text
            const { targetVerseObjects } = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects, _newVerseText)
            _updatedVerseObjects = targetVerseObjects // update verseObjects to match current text
            newState['updatedVerseObjects'] = _updatedVerseObjects
          }
        }

        setState(newState)
        const _alignmentsChanged = (_updatedVerseObjects && !isEqual(initialVerseObjects, _updatedVerseObjects))
        callSetSavedState(verseTextChanged || _alignmentsChanged, newState )
      }
    }
  }

  /**
   * callback from the edit onChange event to update edit state variables
   * @param {boolean} changed - true if the newVerseText is different than the initialVerseText
   * @param {string} newVerseText - current changed verse text
   * @param {string} _initialVerseText - initial verse text
   */
  function setVerseChanged(changed: boolean, newVerseText: string, _initialVerseText: string) {
    const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects, newVerseText)
    const aligned = isUsfmAligned(targetVerseText, originalVerseObjects)
    const verseTextChanged = newVerseText !== initialVerseText

    setState({
      verseTextChanged,
      newVerseText,
      aligned,
    })
  }

  const currentVerseObjects = React.useMemo( () => { // if verse has been edited or alignment changed, then generate new verseObjects to display in ScripturePane
    if (initialVerseObjects) {
      const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, initialVerseObjects, verseTextChanged, newVerseText)
      const currentVerseObjects_ = usfmHelpers.usfmVerseToJson(targetVerseUSFM)
      return currentVerseObjects_
    }
    return initialVerseObjects
  }, [updatedVerseObjects, initialVerseObjects, verseTextChanged, newVerseText])

  const unsavedChanges:boolean = React.useMemo( () => { // if verse has been edited or alignment changed, then indicate we have unsaved changes
    const changed = verseTextChanged || (updatedVerseObjects && !isEqual(initialVerseObjects, updatedVerseObjects))
    return changed
  }, [updatedVerseObjects, initialVerseObjects, verseTextChanged])

  /**
   * callback to scripture card to updated with latest state for saving
   * @param {boolean} unsavedChanges_
   * @param {object} newState
   */
  function callSetSavedState(unsavedChanges_: boolean, newState: {} = { } ) {
    const _newState = {
      ...state,
      ...newState,
    }

    // console.log(`callSetSavedState - new state`, _newState)
    setSavedChanges && setSavedChanges(currentIndex, !unsavedChanges_, {
      getChanges,
      clearChanges,
      state: _newState,
    })
  }

  React.useEffect(() => { // set saved changes whenever user edits verse text or alignments or if alignments are open
    const unsavedChanges_ = unsavedChanges || !!alignerData
    callSetSavedState(unsavedChanges_)
  }, [unsavedChanges, alignerData])

  /**
   * callback for when alignments are being changed
   * @param {AlignerResultsDataType} results
   * @return {boolean} true if alignment is complete
   */
  function onAlignmentsChange(results: AlignerResultsDataType) {
    console.log(`onAlignmentsChange() - alignment changed, results`, results) // merge alignments into target verse and convert to USFM
    const { targetWords, verseAlignments } = results
    const alignmentComplete = AlignmentHelpers.areAlgnmentsComplete(targetWords, verseAlignments)
    console.log(`Alignments are ${alignmentComplete ? 'COMPLETE!' : 'incomplete'}`)
    setState({ newAlignments: results, aligned: alignmentComplete })
    return alignmentComplete
  }

  return {
    actions: {
      cancelAlignment,
      clearChanges,
      getChanges,
      handleAlignmentClick,
      onAlignmentsChange,
      saveAlignment,
      setEditing,
      setVerseChanged,
    },
    state: {
      aligned,
      alignerData,
      currentVerseObjects,
      editing,
      enableEdit,
      enableAlignment,
      initialVerseText,
      initialVerseObjects,
      newVerseText,
      reference: basicReference,
      sourceLanguage,
      targetLanguage,
      title,
      unsavedChanges,
      verseTextChanged,
    },
  }
}
