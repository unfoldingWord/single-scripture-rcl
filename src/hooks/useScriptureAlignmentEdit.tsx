// @ts-ignore
import * as React from 'react'
import {
  AlignmentHelpers,
  UsfmFileConversionHelpers,
  usfmHelpers,
} from 'word-aligner-rcl'
import * as isEqual from 'deep-equal'
import {
  ScriptureConfig,
  ScriptureReference,
  ServerConfig,
} from '../types'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'
import { ORIGINAL_SOURCE } from '../utils'
import useScriptureResources from './useScriptureResources'

interface StartEdit {
  (): Promise<string>;
}

export interface ScriptureALignmentEditProps {
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
  // array of each verse for in reference range
  initialVerseObjects: [],
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
  // details about the current scripture loaded
  scriptureConfig: ScriptureConfig,
  // settings to be used for scripture
  scriptureSettings: { },
  // callback to save current verse edit and alignment changes
  setSavedChanges: Function,
  // callback to create a user branch for saving edit data
  startEditBranch: StartEdit,
  // index to use for book (e.g. `01` for `GEN`)
  bookIndex: string,
  // branch name currently being used (e.g. `master` or user branch)
  workingResourceBranch: string,
  // current target language
  targetLanguage: object,
  // source language
  sourceLanguage: string,
  // title to show in alignment
  title: string,
}

/**
 * determines if alignment is complete based on target USFM and original language verse objects
 * @param {string} targetVerseUSFM
 * @param {object[]} originalVerseObjects
 */
function isUsfmAligned(targetVerseUSFM, originalVerseObjects) {
  originalVerseObjects = originalVerseObjects?.length ? originalVerseObjects : null // make sure not passing empty Array
  const { alignments, wordBank } = AlignmentHelpers.extractAlignmentsFromTargetVerse(targetVerseUSFM, originalVerseObjects)
  return AlignmentHelpers.areAlgnmentsComplete(wordBank, alignments)
}

/**
 * get the updated USFM for target verse from the updated verse objects and latest text
 * @param {object[]} updatedVerseObjects
 * @param {object[]} initialVerseObjects
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
  originalRepoUrl,
  scriptureConfig,
  scriptureSettings,
  setSavedChanges,
  sourceLanguage,
  startEditBranch,
  targetLanguage,
  title,
  workingResourceBranch,
} : ScriptureALignmentEditProps) {
  const [state, setState_] = React.useState({
    aligned: false,
    alignerData: null,
    editing: false,
    newAlignments: null,
    newVerseText: null,
    updatedVerseObjects: null,
    verseTextChanged: false,
  })

  const {
    aligned,
    alignerData,
    editing,
    newAlignments,
    newVerseText,
    updatedVerseObjects,
    verseTextChanged,
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  const reference_ = scriptureConfig?.reference || null

  React.useEffect(() => { // check for context changes, reset edit and alignment state
    console.log(`reference changed ${JSON.stringify(reference_)}`)

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
      console.log(`reference changed, reset edit/alignment state variables`)
      setState(clearState)
    }
  }, [reference_])

  const originalScriptureSettings_ = {
    ...scriptureSettings,
    resourceId: ORIGINAL_SOURCE,
  }

  // @ts-ignore
  httpConfig = httpConfig || {}
  const bookId = reference_?.projectId
  const originalScriptureSettings = getScriptureResourceSettings(
    bookId, originalScriptureSettings_, isNewTestament, originalRepoUrl,
  )

  if (!enableAlignment) { // if not enabled, then we don't fetch resource
    originalScriptureSettings.resourceLink = null
  }

  // get original language for this alignment
  const originalScriptureResource = useScriptureResources({
    bookId,
    scriptureSettings: originalScriptureSettings,
    chapter: reference_?.chapter,
    verse: reference_?.verse,
    isNewTestament,
    originalRepoUrl,
    currentLanguageId: originalScriptureSettings?.languageId,
    currentOwner: originalLanguageOwner,
    httpConfig,
  })

  const originalVerseObjects = React.useMemo(() => { // get the original language verseObjects
    if (originalScriptureResource?.versesForRef?.length > 1) { // if multiple verses, then append them together
      const verseObjects = []

      for (const verseReference of originalScriptureResource?.versesForRef) {
        const origVerseObjects = verseReference?.verseData?.verseObjects

        if (origVerseObjects) {
          Array.prototype.push.apply(verseObjects, origVerseObjects)
        }
      }
      return verseObjects
    }
    return originalScriptureResource?.verseObjects
  }, [originalScriptureResource?.verseObjects, originalScriptureResource?.versesForRef])

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

  function getChanges() {
    console.log(`getChanges - started %{currentIndex}`)
    let updatedVerseObjects_

    if (newAlignments) { // if unsaved alignment changes, apply them
      updatedVerseObjects_ = updateVerseWithNewAlignments()
    } else if (verseTextChanged && newVerseText) {
      const currentVerseObjects_ = updatedVerseObjects || initialVerseObjects
      const { targetVerseObjects } = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects_, newVerseText)
      updatedVerseObjects_ = targetVerseObjects
    } else { // only alignment changes to upload
      updatedVerseObjects_ = updatedVerseObjects || initialVerseObjects
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
      let alignerData_ = null
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
        alignerData_ = { wordBank, alignments }
      } else { // word aligner currently shown
        console.log(`handleAlignmentClick - alignment already shown`)
        alignerData_ = alignerData
      }
      setState({ alignerData: alignerData_ })
      console.log(alignerData_)
    }
  }

  /**
   * get updated verse objects after alignments changed
   * @param {object} _newAlignments - results of aligner
   */
  function updateVerseWithNewAlignments(_newAlignments = newAlignments) {
    const currentVerseObjects_ = updatedVerseObjects || initialVerseObjects
    const targetVerseText = newVerseText || UsfmFileConversionHelpers.convertVerseDataToUSFM(currentVerseObjects_)
    const verseUsfm = AlignmentHelpers.addAlignmentsToVerseUSFM(_newAlignments.targetWords, _newAlignments.verseAlignments, targetVerseText)
    const alignedVerseObjects = usfmHelpers.usfmVerseToJson(verseUsfm)
    return alignedVerseObjects
  }

  /**
   * callback for when user clicked on button to save current alignments in word aligner.  Generates new verse content and saves in state. Closes aligner display
   * @param {object} _newAlignments - results of aligner
   */
  function saveAlignment(_newAlignments = newAlignments) {
    console.log(`saveAlignment() - newAlignments`, _newAlignments)

    if (_newAlignments) {
      const alignedVerseObjects = updateVerseWithNewAlignments(_newAlignments)
      console.log(`saveAlignment() - alignedVerseObjects`, alignedVerseObjects)
      setState({
        alignerData: null,
        editing: false,
        newAlignments: null,
        updatedVerseObjects: alignedVerseObjects,
      })
    } else {
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
    const aligned = isUsfmAligned(targetVerseUSFM, originalScriptureResource?.verseObjects)
    setState({ alignerData: null, aligned })
  }

  /**
   * callback for button to set editing state
   * @param {boolean} editing_ - if true, editor is shown, otherwise editor is hidden
   */
  async function setEditing(editing_) {
    if (enableEdit) {
      if (editing_ && !editing) {
        await startEditBranch()
      }

      if (editing_ !== editing) {
        setState({ editing: editing_ })
      }
    }
  }

  /**
   * callback from the edit onChange event to update edit state variables
   * @param {boolean} changed - true if the newVerseText is different than the initialVerseText
   * @param {string} newVerseText - current changed verse text
   * @param {string} initialVerseText - initial verse text
   */
  function setVerseChanged(changed, newVerseText, initialVerseText) {
    const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(initialVerseObjects, newVerseText)
    const aligned = isUsfmAligned(targetVerseText, originalScriptureResource?.verseObjects)

    setState({
      verseTextChanged: changed,
      initialVerseText,
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

  React.useEffect(() => { // set saved changes whenever user edits verse text or alignments or if alignments are open
    const unsavedChanges_ = unsavedChanges || alignerData
    setSavedChanges && setSavedChanges(currentIndex, !unsavedChanges_, getChanges)
  }, [unsavedChanges, alignerData])

  /**
   * callback for when alignments are being changed
   * @param {object} results
   * @return {boolean} true if alignment is complete
   */
  function onAlignmentsChange(results) {
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
      currentVerseObjects,
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
      editing,
      initialVerseText,
      newVerseText,
      sourceLanguage,
      targetLanguage,
      unsavedChanges,
      verseTextChanged,
      reference: reference_,
      title,
    },
  }
}
