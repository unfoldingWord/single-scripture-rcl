import { createPatch } from 'diff'

/**
 * create a patch of the differences between the contents of originalFile and editedFile
 * @param originalFile
 * @param editedFile
 */
export function getPatch(originalFile, editedFile) {
  const diffResult = createPatch('usfmPatch', originalFile, editedFile)
  return diffResult
}
