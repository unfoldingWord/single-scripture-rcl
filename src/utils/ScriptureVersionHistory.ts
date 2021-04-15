const maxItems = 7
export const KEY_SCRIPTURE_VER_HISTORY = 'scriptureVersionHistory'

export class ScriptureVersionHistory {
  constructor(saveVersionHist, readVersionHist) {
    this.saveVersionHist = saveVersionHist
    this.readVersionHist = readVersionHist
  }

  saveHistory(history) {
    this.saveVersionHist(history) // persist settings
  }

  updateTitle(resourceLink, title) { // update title for resourceLink
    const history = this.getLatest()
    const index = this.findItemIndexByKey(history, 'resourceLink', resourceLink)
    const entry = this.getItemByIndex(index)

    if (entry) {
      if (entry.title !== title) {
        history[index]['title'] = title // update the title
        this.saveVersionHist(history) // persist settings
      }
    }
  }

  getLatest():any[] {
    const value = this.readVersionHist()
    return value || []
  }

  findItemIndexByKey(history, key, match) {
    const index = history.findIndex((item) => (item[key] === match) )
    return index
  }

  getItemByIndex(index, history=null) {
    history = history || this.getLatest()
    return (index >= 0) ? history[index] : null
  }

  getItemByTitle(title) {
    const history = this.getLatest()
    const index = this.findItemIndexByKey(history, 'title', title)
    return this.getItemByIndex(index, history)
  }

  removeItemByIndex(index, history=null) {
    history = history || this.getLatest()

    if ((index >= 0) && (index < history.length)) {
      history.splice(index, 1) // remove old item - we will add it back again to the front
      this.saveVersionHist(history)
    }
  }

  removeUrl(url) {
    const index = this.findItemIndexByKey(this.getLatest(), 'url', url)

    if (index >= 0) {
      this.removeItemByIndex(index)
    }
  }

  removeItem(matchItem, history=null) {
    history = history || this.getLatest()
    const index = this.findItem(matchItem, history)

    if (index >= 0) {
      this.removeItemByIndex(index, history)
    }
  }

  findItem(matchItem, history=null) {
    history = history || this.getLatest()

    const index = history.findIndex((item) => (
      (item.server === matchItem.server) &&
      (item.resourceLink === matchItem.resourceLink)))
    return index
  }

  addItemToHistory(newItem) { // add new item to front of the array and only keep up to maxItems
    let history = this.getLatest()
    let newIndex = -1
    let changed = false
    const index = this.findItem(newItem, history)

    if (index < 0) {
      history.unshift(newItem)
      newIndex = 0
      changed = true
    }

    if (history.length > maxItems) {
      history = history.slice(0, maxItems)
      changed = true
    }

    if (changed) {
      this.saveVersionHist(history)
    }
    return newIndex
  }
}


