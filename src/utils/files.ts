import { applyPatch, createPatch } from 'diff'

/**
 * replace any characters that are not compatible with a json string content
 * @param {string} diffFile
 * @return {string} escaped text
 */
export function escapeJsonStringChars(diffFile) {
  let newDiff = diffFile.replaceAll('\\', '\\\\')
  newDiff = newDiff.replaceAll('\n\r', '\\n')
  newDiff = newDiff.replaceAll('\n', '\\n')
  newDiff = newDiff.replaceAll('"', '\\"')
  return newDiff
}

/**
 * create a patch of the differences between the contents of originalFile and editedFile
 * @param {string} fileName - name of the file being changed
 * @param {string} originalFileContents - original file contents
 * @param {string} editedFileContents - new file contents
 * @param {boolean} jsonEscape - if true then we escape characters to fit in json string contents
 * @param {number} contextLines - number of context lines to include in patch
 * @return {string} - differences between files
 */
export function getPatch(fileName, originalFileContents, editedFileContents, jsonEscape = false, contextLines = 4) {
  let diffResult = createPatch(fileName, originalFileContents, editedFileContents, undefined, undefined, { context: contextLines })

  if (jsonEscape) {
    diffResult = escapeJsonStringChars(diffResult)
  }
  return diffResult
}

/**
 *
 * @param {string} originalFileContents - original file contents
 * @return {string} - updated file contents
 */
export function applyPatchToString(originalText, diff) {
  let newContents = applyPatch(originalText, diff)
  return newContents
}

