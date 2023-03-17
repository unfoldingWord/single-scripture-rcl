// @ts-ignore
import * as React from 'react'
import {
  AlignmentHelpers,
  UsfmFileConversionHelpers,
  usfmHelpers,
} from 'word-aligner-rcl'
import * as isEqual from 'deep-equal'
import { ScriptureConfig, ServerConfig } from '../types'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'
import { ORIGINAL_SOURCE } from '../utils'
import useScriptureResources from './useScriptureResources'

interface StartEdit {
  (): Promise<void>;
}

interface Props {
  currentVerseNum: number,
  enableEdit: boolean,
  enableAlignment: boolean,
  httpConfig: ServerConfig,
  isNewTestament: boolean,
  originalLanguageOwner: string,
  originalRepoUrl: string,
  scriptureConfig: ScriptureConfig,
  scriptureSettings: { },
  startEdit: StartEdit,
  initialVerseObjects: [],
}

function isUsfmAligned(targetVerseUSFM, originalVerseObjects) {
  originalVerseObjects = originalVerseObjects?.length ? originalVerseObjects : null // make sure not passing empty Array
  const { alignments, wordBank } = AlignmentHelpers.extractAlignmentsFromTargetVerse(targetVerseUSFM, originalVerseObjects)
  return AlignmentHelpers.areAlgnmentsComplete(wordBank, alignments)
}

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

export function useScriptureAlignmentEdit({
  currentVerseNum,
  enableEdit,
  enableAlignment,
  httpConfig,
  isNewTestament,
  originalLanguageOwner,
  originalRepoUrl,
  scriptureConfig,
  scriptureSettings,
  startEdit,
  initialVerseObjects,
} : Props) {
  const [state, setState_] = React.useState({
    aligned: false,
    alignerData: null,
    editing: false,
    initialVerseText: null,
    newAlignments: null,
    newVerseText: null,
    updatedVerseObjects: null,
    verseTextChanged: false,
    unsavedChanges: null,
  })

  const {
    aligned,
    alignerData,
    editing,
    initialVerseText,
    newAlignments,
    newVerseText,
    updatedVerseObjects,
    verseTextChanged,
    unsavedChanges,
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  React.useEffect(() => { // check for context changes, reset edit and alignment state
    console.log(`context changed, reset edit/alignment state variables`)
    setState({
      aligned: false,
      alignerData: null,
      editing: false,
      initialVerseText: null,
      newAlignments: null,
      newVerseText: null,
      updatedVerseObjects: null,
      verseTextChanged: false,
    })
  }, [scriptureConfig?.reference])

  const originalScriptureSettings_ = {
    ...scriptureSettings,
    resourceId: ORIGINAL_SOURCE,
  }

  // @ts-ignore
  httpConfig = httpConfig || {}
  const bookId = scriptureConfig?.reference?.projectId
  const originalScriptureSettings = getScriptureResourceSettings(
    bookId, originalScriptureSettings_, isNewTestament, originalRepoUrl,
  )

  if (!enableAlignment) { // if not enabled, then we don't fetch resource
    originalScriptureSettings.resourceLink = null
  }

  // get original language for alignment
  const originalScriptureResource = useScriptureResources({
    bookId,
    scriptureSettings: originalScriptureSettings,
    chapter: scriptureConfig?.reference?.chapter,
    verse: scriptureConfig?.reference?.verse,
    isNewTestament,
    originalRepoUrl,
    currentLanguageId: originalScriptureSettings?.languageId,
    currentOwner: originalLanguageOwner,
    httpConfig,
  })

  React.useEffect(() => { // update alignment status when aligner is hidden
    const notEmpty = !!initialVerseObjects
    let aligned_ = false

    if (!alignerData) { // skip if aligner is being shown
      if (notEmpty) { // skip if empty
        const originalVerseObjects = originalScriptureResource?.verseObjects
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
  }, [initialVerseObjects, alignerData, newVerseText, initialVerseText, enableAlignment, originalScriptureResource?.verseObjects])

  React.useEffect(() => { // update unsaved changes state when text or alignment is changed
    let newUnsavedChanges = {};
    if (initialVerseText !== newVerseText) {
      newUnsavedChanges = {...newUnsavedChanges, newVerseText}
    }
    if (updatedVerseObjects !== null) {
      newUnsavedChanges = {...newUnsavedChanges, newAlignedVerseObjects: {...updatedVerseObjects}}
    }
    if (Object.keys(newUnsavedChanges)) {
      setState({unsavedChanges: newUnsavedChanges})
      console.log(`Updated Unsaved Changes: ${newUnsavedChanges}`)
    }
  }, [newVerseText, initialVerseText, updatedVerseObjects])

  function saveEdit() {
    console.log(`saveEdit`)
    let updatedVerseObjects_

    if (newAlignments) { // if unsaved alignment changes, apply them
      updatedVerseObjects_ = updateVerseWithNewAlignments()
    } else if (verseTextChanged && newVerseText) {
      const currentVerseObjects_ = updatedVerseObjects || initialVerseObjects
      const { targetVerseText, targetVerseObjects } = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects_, newVerseText)
      console.log(`saveEdit() - new text:`, targetVerseText)
      updatedVerseObjects_ = targetVerseObjects
    }

    if (updatedVerseObjects_) {
      updateVerseNum(currentVerseNum, updatedVerseObjects_)
      //TODO add save to user branch
    }

    setState({
      unsavedChanges: null,
      updatedVerseObjects: null,
      editing: false,
      newVerseText: null,
      alignerData: null,
    })
  }

  function updateVerseNum(index, newVerseObjects = initialVerseObjects) {
    // @ts-ignore
    const ref = scriptureConfig?.versesForRef?.[index]
    let targetVerseObjects_ = null

    if (ref) {
      if (newVerseText) {
        const { targetVerseObjects } = AlignmentHelpers.updateAlignmentsToTargetVerse(newVerseObjects, newVerseText)
        targetVerseObjects_ = targetVerseObjects
      } else {
        targetVerseObjects_ = newVerseObjects
      }

      // @ts-ignore
      targetVerseObjects_ && scriptureConfig?.updateVerse(ref.chapter, ref.verse, { verseObjects: targetVerseObjects_ })
    }
  }

  function handleAlignmentClick() {
    if (enableAlignment) {
      let alignerData_ = null

      if (!alignerData) { // if word aligner not shown
        console.log(`handleAlignmentClick - toggle ON alignment`)
        const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, initialVerseObjects, verseTextChanged, newVerseText)
        const originalVerseObjects = originalScriptureResource?.verseObjects
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

  function updateVerseWithNewAlignments() {
    const currentVerseObjects_ = updatedVerseObjects || initialVerseObjects
    const targetVerseText = newVerseText || UsfmFileConversionHelpers.convertVerseDataToUSFM(currentVerseObjects_)
    const verseUsfm = AlignmentHelpers.addAlignmentsToVerseUSFM(newAlignments.targetWords, newAlignments.verseAlignments, targetVerseText)
    const alignedVerseObjects = usfmHelpers.usfmVerseToJson(verseUsfm)
    return alignedVerseObjects
  }

  function saveAlignment() {
    console.log(`saveAlignment()`)

    if (newAlignments) {
      const alignedVerseObjects = updateVerseWithNewAlignments()
      updateVerseNum(currentVerseNum, alignedVerseObjects)

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

  function cancelAlignment() {
    console.log(`cancelAlignment()`)
    const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, initialVerseObjects, verseTextChanged, newVerseText)
    const aligned = isUsfmAligned(targetVerseUSFM, originalScriptureResource?.verseObjects)
    setState({ alignerData: null, aligned })
  }

  function setEditing(editing_) {
    if (enableEdit) {
      (editing_ && !editing) && startEdit()

      if (editing_ !== editing) {
        setState({ editing: editing_ })
      }
    }
  }

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

  const saved = React.useMemo( () => // if verse has been edited or alignment changed, then generate new verseObjects to display in ScripturePane
    !verseTextChanged && (!updatedVerseObjects || isEqual(initialVerseObjects, updatedVerseObjects))
  , [updatedVerseObjects, initialVerseObjects, verseTextChanged])

  function onAlignmentsChange(results) {
    console.log(`onAlignmentsChange() - alignment changed, results`, results) // merge alignments into target verse and convert to USFM
    const { targetWords, verseAlignments } = results
    const alignmentComplete = AlignmentHelpers.areAlgnmentsComplete(targetWords, verseAlignments)
    console.log(`Alignments are ${alignmentComplete ? 'COMPLETE!' : 'incomplete'}`)
    setState({ newAlignments: results, aligned: alignmentComplete })
  }

  return {
    actions: {
      cancelAlignment,
      currentVerseObjects,
      handleAlignmentClick,
      onAlignmentsChange,
      saveAlignment,
      setEditing,
      setVerseChanged,
      saveEdit,
    },
    state: {
      aligned,
      alignerData,
      editing,
      verseTextChanged,
      saved,
      unsavedChanges,
    },
  }
}
