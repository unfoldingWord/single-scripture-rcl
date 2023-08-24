
import { getCurrentBook } from "./ScriptureCard";

describe('getCurrentBook', () => {
  it('should succeed when blah blah', () => {
      // Given
      const bookId = 'tit'
      const filename = '57-TIT.usfm'
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
      expect(bibleUsfm).toEqual(scriptureConfig.bibleUsfm)
  })
})
