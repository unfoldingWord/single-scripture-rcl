// @ts-ignore
import * as React from 'react'
import {
  AlignmentHelpers,
  UsfmFileConversionHelpers,
  usfmHelpers,
} from 'word-aligner-rcl'

interface StartEdit {
  (): Promise<void>;
}

interface Props {
  scriptureConfig: {};
  startEdit: StartEdit,
  usingOriginalBible: boolean,
  verseObjects_: [],
}

function isUsfmAligned(targetVerseUSFM) {
  const { alignments, wordBank } = AlignmentHelpers.extractAlignmentsFromTargetVerse(targetVerseUSFM, null)
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

export function useScriptureAlignment({
  scriptureConfig,
  startEdit,
  usingOriginalBible,
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
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  React.useEffect(() => { // update alignment status when aligner is hidden
    const notEmpty = !!verseObjects_
    let aligned_ = false

    if (!alignerData) { // skip if aligner is being shown
      if (notEmpty) { // skip if empty
        if (usingOriginalBible) {
          aligned_ = true
        } else if (newVerseText && (newVerseText !== initialVerseText)) {
          const results = AlignmentHelpers.updateAlignmentsToTargetVerse(verseObjects_, newVerseText)
          aligned_ = isUsfmAligned(results?.targetVerseText)
        } else {
          const targetVerseUSFM = UsfmFileConversionHelpers.convertVerseDataToUSFM(verseObjects_)
          aligned_ = isUsfmAligned(targetVerseUSFM)
        }
      }
      setState({ aligned: aligned_ })
    }
  }, [verseObjects_, newVerseText, aligned, usingOriginalBible])

  function onSaveEdit() {
    console.log(`onSaveEdit`)

    if (verseTextChanged && newVerseText) {
      const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(verseObjects_, newVerseText)
      console.log(`onSaveEdit() - new text:`, targetVerseText)
      updateVerseNum(0)
    }
    setState({
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
    let alignerData_ = null

    if (!alignerData && newVerseText) { // if word aligner not shown
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

  function saveAlignment() {
    console.log(`saveAlignment()`)
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
  }

  function cancelAlignment() {
    console.log(`cancelAlignment()`)
    const targetVerseUSFM = getCurrentVerseUsfm(updatedVerseObjects, verseObjects_, verseTextChanged, newVerseText)
    const aligned = isUsfmAligned(targetVerseUSFM)
    setState({ alignerData: null, aligned })
  }

  function setEditing_(editing_) {
    (editing_ && !editing) && startEdit()

    if (editing_ !== editing) {
      setState({ editing: editing_ })
    }
  }

  function setVerseChanged_(changed, newVerseText, initialVerseText) {
    const { targetVerseText } = AlignmentHelpers.updateAlignmentsToTargetVerse(verseObjects_, newVerseText)
    const aligned = isUsfmAligned(targetVerseText)

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
    },
  }
}
