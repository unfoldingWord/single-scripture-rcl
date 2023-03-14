// @ts-ignore
import * as React from 'react'
import {
  AlignmentHelpers,
  UsfmFileConversionHelpers,
  usfmHelpers,
} from 'word-aligner-rcl'
import { ScriptureConfig, ServerConfig } from '../types'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'
import { ORIGINAL_SOURCE } from '../utils'
import useScriptureResources from './useScriptureResources'

interface StartEdit {
  (): Promise<void>;
}

interface Props {
  enableEdit: boolean,
  enableAlignment: boolean,
  httpConfig: ServerConfig,
  isNewTestament: boolean,
  originalLanguageOwner: string,
  originalRepoUrl: string,
  scriptureConfig: ScriptureConfig,
  scriptureSettings: { },
  startEdit: StartEdit,
  verseObjects_: [],
}

function isUsfmAligned(targetVerseUSFM, originalVerseObjects) {
  originalVerseObjects = originalVerseObjects?.length ? originalVerseObjects : null // make sure not passing empty Array
  const { alignments, wordBank } = AlignmentHelpers.extractAlignmentsFromTargetVerse(targetVerseUSFM, originalVerseObjects)
  return AlignmentHelpers.areAlgnmentsComplete(wordBank, alignments)
}

function getCurrentVerseUsfm(updatedVerseObjects, verseObjects_, verseTextChanged: boolean, newVerseText) {
  let targetVerseUSFM = null
  const currentVerseObjects = updatedVerseObjects || verseObjects_

  if (verseTextChanged && newVerseText) {
    const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(currentVerseObjects, newVerseText)
    targetVerseUSFM = targetVerseText
  } else {
    targetVerseUSFM = UsfmFileConversionHelpers.convertVerseDataToUSFM(currentVerseObjects)
  }
  return targetVerseUSFM
}

export function useScriptureAlignmentEdit({
  enableEdit,
  enableAlignment,
  httpConfig,
  isNewTestament,
  originalLanguageOwner,
  originalRepoUrl,
  scriptureConfig,
  scriptureSettings,
  startEdit,
  verseObjects_,
} : Props) {
  const [state, setState_] = React.useState({
    editing: false,
    verseTextChanged: false,
    initialVerseText: null,
    newVerseText: null,
    aligned: false,
    alignerData: null,
    newAlignments: null,
    updatedVerseObjects: null,
    unsavedChanges: null,
  })

  const {
    editing,
    verseTextChanged,
    initialVerseText,
    newVerseText,
    aligned,
    alignerData,
    newAlignments,
    updatedVerseObjects,
    unsavedChanges,
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  const scriptureSettings_ = {
    ...scriptureSettings,
    resourceId: ORIGINAL_SOURCE,
  }

  // @ts-ignore
  httpConfig = httpConfig || {}
  const bookId = scriptureConfig?.reference?.projectId
  const originalScriptureSettings = getScriptureResourceSettings(
    bookId, scriptureSettings_, isNewTestament, originalRepoUrl,
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
    const notEmpty = !!verseObjects_
    let aligned_ = false

    if (!alignerData) { // skip if aligner is being shown
      if (notEmpty) { // skip if empty
        const originalVerseObjects = originalScriptureResource?.verseObjects

        if (!enableAlignment) {
          aligned_ = true
        } else if (newVerseText && (newVerseText !== initialVerseText)) {
          const results = AlignmentHelpers.updateAlignmentsToTargetVerse(verseObjects_, newVerseText)
          aligned_ = isUsfmAligned(results?.targetVerseText, originalVerseObjects)
        } else {
          const targetVerseUSFM = UsfmFileConversionHelpers.convertVerseDataToUSFM(verseObjects_)
          aligned_ = isUsfmAligned(targetVerseUSFM, originalVerseObjects)
        }
      }

      if (aligned !== aligned_) {
        setState({ aligned: aligned_ })
      }
    }
  }, [verseObjects_, alignerData, newVerseText, initialVerseText, enableAlignment, originalScriptureResource?.verseObjects])

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

  function onSaveEdit() {
    console.log(`onSaveEdit`)

    if (verseTextChanged && newVerseText) {
      const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(verseObjects_, newVerseText)
      console.log(`onSaveEdit() - new text:`, targetVerseText)
      updateVerseNum(0)
    }
    setState({
      unsavedChanges: null,
      updatedVerseObjects: null,
      editing,
      newVerseText: null,
      alignerData: null,
    })
  }

  function updateVerseNum(index, newVerseObjects = verseObjects_) {
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
        const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, verseObjects_, verseTextChanged, newVerseText)
        const {
          wordListWords: wordBank,
          verseAlignments: alignments,
        } = AlignmentHelpers.parseUsfmToWordAlignerData(targetVerseUSFM, null)
        alignerData_ = { wordBank, alignments }
      } else { // word aligner currently shown
        console.log(`handleAlignmentClick - alignment already shown`)
        alignerData_ = alignerData
      }
      setState({ alignerData: alignerData_ })
      console.log(alignerData_)
    }
  }

  function saveAlignment() {
    console.log(`saveAlignment()`)
    if (newAlignments) {
      const targetVerseText = newVerseText || UsfmFileConversionHelpers.convertVerseDataToUSFM(verseObjects_)
      const verseUsfm = AlignmentHelpers.addAlignmentsToVerseUSFM(newAlignments.wordListWords, newAlignments.verseAlignments, targetVerseText)
      const alignedVerseObjects = usfmHelpers.usfmVerseToJson(verseUsfm)
      updateVerseNum(0, alignedVerseObjects)
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
    const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, verseObjects_, verseTextChanged, newVerseText)
    const aligned = isUsfmAligned(targetVerseUSFM, originalScriptureResource?.verseObjects)
    setState({ alignerData: null, aligned })
  }

  function setEditing_(editing_) {
    if (enableEdit) {
      (editing_ && !editing) && startEdit()

      if (editing_ !== editing) {
        setState({ editing: editing_ })
      }
    }
  }

  function setVerseChanged_(changed, newVerseText, initialVerseText) {
    const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(verseObjects_, newVerseText)
    const aligned = isUsfmAligned(targetVerseText, originalScriptureResource?.verseObjects)

    setState({
      verseTextChanged: changed,
      initialVerseText,
      newVerseText,
      aligned,
    })
  }

  const currentVerseObjects = React.useMemo( () => { // if verse has been edited or alignment changed, then generate new verseObjects to display in ScripturePane
    if (verseObjects_) {
      const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, verseObjects_, verseTextChanged, newVerseText)
      const currentVerseObjects = usfmHelpers.usfmVerseToJson(targetVerseUSFM)
      return currentVerseObjects
    }
    return verseObjects_
  }, [updatedVerseObjects, verseObjects_, verseTextChanged, newVerseText])

  function onAlignmentsChange(results) {
    console.log(`onAlignmentsChange() - alignment changed, results`, results) // merge alignments into target verse and convert to USFM
    const { wordListWords, verseAlignments } = results
    const alignmentComplete = AlignmentHelpers.areAlgnmentsComplete(wordListWords, verseAlignments)
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
      setEditing_,
      setVerseChanged_,
      onSaveEdit,
    },
    state: {
      aligned,
      alignerData,
      editing,
      verseTextChanged,
      unsavedChanges,
    },
  }
}
