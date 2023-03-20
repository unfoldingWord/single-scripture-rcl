// @ts-ignore
import * as React from 'react'
import {
  AlignmentHelpers,
  UsfmFileConversionHelpers,
  usfmHelpers,
} from 'word-aligner-rcl'
import * as isEqual from 'deep-equal'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { useEdit } from 'gitea-react-toolkit'
import usfmjs from 'usfm-js'
import { ScriptureConfig, ServerConfig } from '../types'
import { getScriptureResourceSettings } from '../utils/ScriptureSettings'
import { ORIGINAL_SOURCE } from '../utils'
import useScriptureResources from './useScriptureResources'

interface StartEdit {
  (): Promise<string>;
}

interface Props {
  authentication: { config: object, token: string },
  currentVerseNum: number,
  enableEdit: boolean,
  enableAlignment: boolean,
  httpConfig: ServerConfig,
  initialVerseObjects: [],
  isNewTestament: boolean,
  loggedInUser: string,
  originalLanguageOwner: string,
  originalRepoUrl: string,
  scriptureConfig: ScriptureConfig,
  scriptureSettings: { },
  setSavedChanges: Function,
  startEditBranch: StartEdit,
  bookIndex: string,
  workingResourceBranch: string,
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
  authentication,
  currentVerseNum,
  enableEdit,
  enableAlignment,
  httpConfig,
  initialVerseObjects,
  isNewTestament,
  loggedInUser,
  originalLanguageOwner,
  originalRepoUrl,
  scriptureConfig,
  scriptureSettings,
  startEditBranch,
  bookIndex,
  workingResourceBranch,
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
    saveContent: null,
    startSave: false,
    sha: null,
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
    saveContent,
    startSave,
    sha,
  } = state

  function setState(newState) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  const reference_ = scriptureConfig?.reference || null
  // if the verse text is edited, updated alignments (verse objects changed), or aligner is open; then we have unsaved edits
  const unsavedChanges = (initialVerseText !== newVerseText) || updatedVerseObjects || alignerData

  useDeepCompareEffect(() => { // check for context changes, reset edit and alignment state
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

  // @ts-ignore
  const fetchResp_ = scriptureConfig?.fetchResponse
  const owner = scriptureConfig?.resource?.owner
  const repo = `${scriptureConfig?.resource?.languageId}_${scriptureConfig?.resource?.projectId}`

  React.useEffect(() => { // get the sha from last scripture download
    const sha = fetchResp_?.data?.sha || null
    console.log(`for ${JSON.stringify(reference_)} new sha is ${sha}`)
    setState({ sha })
    // @ts-ignore
  }, [fetchResp_])

  function getBookName() {
    const bookCaps = scriptureConfig?.reference?.projectId ? scriptureConfig.reference.projectId.toUpperCase() : ''
    return `${bookIndex}-${bookCaps}.usfm`
  }

  const filepath = getBookName()

  // TODO:  enable save
  const {
    editResponse,
    error,
    isEditing,
    isError,
    onSaveEdit,
  } = useEdit({
    sha,
    owner,
    content: saveContent,
    config: {
      cache: { maxAge: 0 },
      ...authentication?.config,
      token: authentication?.token,
      // @ts-ignore
      timeout: httpConfig?.serverTimeOut || httpConfig?.timeout || 5000,
    },
    author: loggedInUser,
    token: authentication?.token,
    branch: workingResourceBranch,
    filepath,
    repo,
  })

  if (!enableAlignment) { // if not enabled, then we don't fetch resource
    originalScriptureSettings.resourceLink = null
  }

  // get original language for alignment
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

  function saveEdit() {
    console.log(`saveEdit - started`)
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
      const newBookJson = updateVerseNum(currentVerseNum, updatedVerseObjects_)
      const newUsfm = usfmjs.toUSFM(newBookJson, { forcedNewLines: true })
      setState({ saveContent: newUsfm, startSave: true })
    }
  }

  React.useEffect(() => {
    const saveEdit = async () => {
      let branch = (workingResourceBranch !== 'master') ? workingResourceBranch : undefined

      if (!branch) {
        branch = await startEditBranch() // make sure user branch exists and get name
      }

      await onSaveEdit(branch).then((success) => { // push changed to server
        if (success) {
          console.log(`save scripture edits success`)
          setState({
            updatedVerseObjects: null,
            editing: false,
            newVerseText: null,
            alignerData: null,
            startSave: false,
            verseTextChanged: false,
            initialVerseText: null,
          })
          console.info('Reloading resource')
          scriptureConfig?.reloadResource()
        } else {
          console.error('saving changed scripture failed')
          setState({ startSave: false })
        }
      })
    }

    if (startSave) {
      console.log(`saveEdit - calling onSaveEdit()`)
      saveEdit()
    }
  }, [startSave])

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
      return targetVerseObjects_ && scriptureConfig?.updateVerse(ref.chapter, ref.verse, { verseObjects: targetVerseObjects_ })
    }
    return null
  }

  function handleAlignmentClick() {
    if (enableAlignment) {
      let alignerData_ = null
      startEditBranch()

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
      (editing_ && !editing) && startEditBranch()

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
      saveChangesToCloud: saveEdit,
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
