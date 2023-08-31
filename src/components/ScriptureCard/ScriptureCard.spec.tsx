/// <reference types="jest" />
import { getCurrentBook } from './ScriptureCard'

describe('getCurrentBook', () => {
  it('should succeed when bookId is tit and filename is 57-TIT.usfm', () => {
    // Given
    const bookId = 'tit'
    const filename = '57-TIT.usfm'
    const scriptureConfig = {
      bibleUsfm: '\\id TIT EN_ULT en_English_ltr Wed Dec 14 2022 14:59:15 GMT-0500 (Eastern Standard Time) tc',
      bookObjects: {
        chapters: {
          1: {
            1: 'stuff'
          },
        },
        headers: [],
        name: filename
      }
    }

    // when
    const bibleUsfm = getCurrentBook(scriptureConfig, bookId)

    // then
    console.log(bibleUsfm)
    expect(bibleUsfm).toEqual(scriptureConfig.bibleUsfm)
  })

  it('should succeed when bookId is 1jn and filename is 15-1JN.usfm', () => {
    // Given
    const bookId = '1jn'
    const filename = '15-1JN.usfm'
    const scriptureConfig = {
      bibleUsfm: '\\id 1JN EN_ULT en_English_ltr Wed Dec 14 2022 14:59:15 GMT-0500 (Eastern Standard Time) tc',
      bookObjects: {
        chapters: {
          1: {
            1: 'stuff'
          },
        },
        headers: [],
        name: filename
      }
    }

    // when
    const bibleUsfm = getCurrentBook(scriptureConfig, bookId)

    // then
    console.log(bibleUsfm)
    expect(bibleUsfm).toEqual(scriptureConfig.bibleUsfm)
  })

  it('should fail when bibleUsfm is JHN and filename is 15-1JN.usfm', () => {
    // Given
    const bookId = '1jn'
    const filename = '15-1JN.usfm'
    const FAIL = null
    const scriptureConfig = {
      bibleUsfm: '\\id JHN EN_ULT en_English_ltr Wed Dec 14 2022 14:59:15 GMT-0500 (Eastern Standard Time) tc',
      bookObjects: {
        chapters: {
          1: {
            1: 'stuff'
          },
        },
        headers: [],
        name: filename
      }
    }

    // when
    const bibleUsfm = getCurrentBook(scriptureConfig, bookId)

    // then
    console.log(bibleUsfm)
    expect(bibleUsfm).toEqual(FAIL)
  })

  it('should fail when bookId is null and filename is 15-1JN.usfm', () => {
    // Given
    const bookId = null
    const filename = '15-1JN.usfm'
    const FAIL = null
    const scriptureConfig = {
      bibleUsfm: 'the Bible',
      bookObjects: {
        chapters: {
          1: {
            1: 'stuff'
          },
        },
        headers: [],
        name: filename
      }
    }
    // when

    const bibleUsfm = getCurrentBook(scriptureConfig, bookId)
    // then
    console.log(bibleUsfm)
    expect(bibleUsfm).toEqual(FAIL)
  })

  it('should fail when bookId is undefined and filename is 15-1JN.usfm', () => {
    // Given
    const bookId = undefined
    const filename = '15-1JN.usfm'
    const FAIL = null
    const scriptureConfig = {
      bibleUsfm: 'the Bible',
      bookObjects: {
        chapters: {
          1: {
            1: 'stuff'
          },
        },
        headers: [],
        name: filename
      }
    }
    // when

    const bibleUsfm = getCurrentBook(scriptureConfig, bookId)
    // then
    console.log(bibleUsfm)
    expect(bibleUsfm).toEqual(FAIL)
  })

  it('should fail when bookId is "" and filename is 15-1JN.usfm', () => {
    // Given
    const bookId = ''
    const filename = '15-1JN.usfm'
    const FAIL = null
    const scriptureConfig = {
      bibleUsfm: 'the Bible',
      bookObjects: {
        chapters: {
          1: {
            1: 'stuff'
          },
        },
        headers: [],
        name: filename
      }
    }
    // when

    const bibleUsfm = getCurrentBook(scriptureConfig, bookId)
    // then
    console.log(bibleUsfm)
    expect(bibleUsfm).toEqual(FAIL)
  })
})
