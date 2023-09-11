/// <reference types="jest" />
import path from 'path'
import fs from 'fs-extra'
import { escapeJsonStringChars, getPatch } from '../files'

const fileName = '57-TIT.usfm'
const filePath = path.join(__dirname, './fixture', fileName)
const titUsfm = fs.readFileSync(filePath, 'utf-8')

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
})
