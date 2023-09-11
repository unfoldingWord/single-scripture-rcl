/// <reference types="jest" />
import path from 'path'
import fs from 'fs-extra'
import { getPatch } from '../files'

const fileName = path.join(__dirname, './fixture/57-TIT.usfm')
const titUsfm = fs.readFileSync(fileName, 'utf-8')

describe('diff', () => {
  it('should succeed', () => {
    // given
    const editedFile = titUsfm.replace(`\\v 1 `, `\\v 1 EDITED verse: `)
    // console.log(titUsfm, editedFile)

    // when
    const diffResult = getPatch(titUsfm, editedFile)

    // then
    console.log(diffResult)
    expect(diffResult).toMatchSnapshot()
  })
})
