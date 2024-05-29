/// <reference types="jest" />
import path from 'path'
import fs from 'fs-extra'
import {
  applyPatchToString,
  escapeJsonStringChars,
  getPatch,
} from '../files'

////////////////////////////////
// to apply a patech file from command line do: `patch test.txt < patch.txt`
////////////////////////////////

const fileName = '57-TIT.usfm'
const filePath = path.join(__dirname, './fixture', fileName)
const diffPath = path.join(__dirname, './fixture/diff')
const titUsfm = fs.readFileSync(filePath, 'utf-8')
const initialUSFM = getDiffFile('initialUSFM.txt')
const finalUSFM = getDiffFile('finalUSFM.txt')
const patch = getDiffFile('patch.txt')

describe('escapeJsonStringChars', () => {
  it('should escape invalid characters', () => {
    // given
    const rawData = '\\p\n' +
      '\\v 1 \\zaln-s |x-strong="G39720" x-lemma="Παῦλος" x-morph="Gr,N,,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="Παῦλος"\\*\\w Paul|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*,\n'
    const expectedEscapedData = '\\\\p\\n' +
      '\\\\v 1 \\\\zaln-s |x-strong=\\"G39720\\" x-lemma=\\"Παῦλος\\" x-morph=\\"Gr,N,,,,,NMS,\\" x-occurrence=\\"1\\" x-occurrences=\\"1\\" x-content=\\"Παῦλος\\"\\\\*\\\\w Paul|x-occurrence=\\"1\\" x-occurrences=\\"1\\"\\\\w*\\\\zaln-e\\\\*,\\n'

    // when
    const safeData = escapeJsonStringChars(rawData)

    // then
    console.log(safeData)
    expect(safeData).toEqual(expectedEscapedData)
  })
})

describe('getPatch', () => {
  it('should succeed with no escaping', () => {
    // given
    const editedFile = titUsfm.replace(`\\v 1 `, `\\v 1 EDITED verse: `)
    // console.log(titUsfm, editedFile)

    // when
    const diffResult = getPatch(fileName, titUsfm, editedFile, false)

    // then
    console.log(diffResult)
    expect(diffResult).toMatchSnapshot()
  })

  it('should succeed with escaping', () => {
    // given
    const editedFile = titUsfm.replace(`\\v 1 `, `\\v 1 EDITED verse: `)
    // console.log(titUsfm, editedFile)

    // when
    const diffResult = getPatch(fileName, titUsfm, editedFile, true)

    // then
    console.log(diffResult)
    expect(diffResult).toMatchSnapshot()
  })

  it('generate patch for USFM should succeed', () => {
    // given
    const expectedDiff = patch

    // when
    const diffResult = getPatch('32-JON.usfm', initialUSFM, finalUSFM, false)

    // then
    expect(diffResult).toEqual(expectedDiff)
  })
})

describe('applyPatch', () => {
  it('apply patch for USFM should succeed', () => {
    // given
    const expectedFinal = finalUSFM

    // when
    const newData = applyPatchToString(initialUSFM, patch)

    // then
    expect(newData).toEqual(expectedFinal)
  })
})

////////////////////////////////
// helpers
////////////////////////////////

function getDiffFile(filename) {
  const data = fs.readFileSync(path.join(diffPath, filename), 'utf-8')
  return data
}
