import * as React from 'react'
import * as PropTypes from 'prop-types'
import { Card, useCardState } from 'translation-helps-rcl'
import { ScripturePane, ScriptureSelector } from '..'
import { updateTitle } from '../../utils/ScriptureVersionHistory'
import { useScriptureSettings } from '../../hooks/useScriptureSettings'
import { getScriptureVersionSettings } from '../../utils/ScriptureSettings'
import { Title } from '../ScripturePane/styled'

const KEY_FONT_SIZE_BASE = 'scripturePaneFontSize_'
const label = 'Version'
const style = { marginTop: '16px', width: '500px' }

export default function ScriptureCard({
  isNT,
  title,
  server,
  branch,
  cardNum,
  classes,
  resource: {
    owner,
    languageId,
    resourceId,
    originalLanguageOwner,
  },
  getLanguage,
  reference: {
    verse,
    chapter,
    projectId: bookId,
  },
  resourceLink,
  useLocalStorage,
  disableWordPopover,
}) {
  const [fontSize, setFontSize] = useLocalStorage(KEY_FONT_SIZE_BASE + cardNum, 100)
  const { scriptureConfig, setScripture } = useScriptureSettings({
    isNT,
    title,
    verse,
    owner,
    bookId,
    branch,
    server,
    cardNum,
    chapter,
    languageId,
    resourceId,
    resourceLink,
    useLocalStorage,
    disableWordPopover,
    originalLanguageOwner,
  })

  if (scriptureConfig.title) {
    const title = `${scriptureConfig.title} v${scriptureConfig.version}`
    updateTitle(scriptureConfig.resourceLink, title)
  }

  /** Dynamically creates the scripture selection dropdown to be inserted into card settings */
  function getScriptureSelector() {
    const scriptureSelectionConfig = getScriptureVersionSettings({
      label,
      resourceLink: scriptureConfig.resourceLink,
      setScripture,
    })

    return <ScriptureSelector {...scriptureSelectionConfig} style={style} />
  }

  // @ts-ignore
  const languageId_ = scriptureConfig?.resource?.languageId
  const language = getLanguage({ languageId: languageId_ })
  const direction = (language?.direction) || 'ltr'
  const reference = { ...scriptureConfig.reference }

  const isHebrew = (languageId_ === 'hbo')
  const fontFactor = isHebrew ? 1.4 : 1 // we automatically scale up font size for Hebrew
  const scaledFontSize = fontSize * fontFactor

  if (scriptureConfig.matchedVerse) { // support verse ranges
    reference.verse = scriptureConfig.matchedVerse
  }

  const items = null
  const {
    state: {
      headers, filters, itemIndex, markdownView,
    },
    actions: {
      setFilters, setItemIndex, setMarkdownView,
    },
  } = useCardState({ items })

  const refStyle = {
    fontFamily: 'Noto Sans',
    fontSize: `${Math.round(scaledFontSize * 0.9)}%`,
  }

  const contentStyle = {
    fontFamily: 'Noto Sans',
    fontSize: `${scaledFontSize}%`,
  }

  const scriptureLabel =
    <Title>{scriptureConfig.title} v{scriptureConfig.version}</Title>

  return (
    <Card
      title={scriptureLabel}
      items={items}
      classes={classes}
      headers={headers}
      filters={filters}
      fontSize={fontSize}
      itemIndex={itemIndex}
      setFilters={setFilters}
      setFontSize={setFontSize}
      setItemIndex={setItemIndex}
      markdownView={markdownView}
      setMarkdownView={setMarkdownView}
      getCustomComponent={getScriptureSelector}
      hideMarkdownToggle
    >
      <ScripturePane
        refStyle={refStyle}
        {...scriptureConfig}
        reference={reference}
        direction={direction}
        contentStyle={contentStyle}
        disableWordPopover={disableWordPopover}
      />
    </Card>
  )
}

ScriptureCard.propTypes = {
  /** method to determine if NT or OT */
  isNT: PropTypes.func.isRequired,
  /** title for scripture card */
  title: PropTypes.string.isRequired,
  /** get language details */
  getLanguage: PropTypes.func.isRequired,
  /** scripture card number (0 to 2 for example) */
  cardNum: PropTypes.number.isRequired,
  /** resource object */
  resource: PropTypes.shape({
    /** resource language to use */
    languageId: PropTypes.string.isRequired,
    /** repo owner such as unfoldingWord */
    owner: PropTypes.string.isRequired,
    /** resourceId to use (e.g. ugnt) */
    resourceId: PropTypes.string.isRequired,
    /** repo owner for original languages such as unfoldingWord */
    originalLanguageOwner: PropTypes.string.isRequired,
  }),
  reference: PropTypes.shape({
    /** projectId (bookID) to use */
    projectId: PropTypes.string.isRequired,
    /** current chapter number */
    chapter: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    /** current verse number */
    verse: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }),
  /** server (e.g. 'https://git.door43.org') */
  server: PropTypes.string.isRequired,
  /** repo branch such as master */
  branch: PropTypes.string.isRequired,
  /** if true then word data hover is shown */
  disableWordPopover: PropTypes.bool,
  /** CSS classes */
  classes: PropTypes.object,
  /** resourceLink */
  resourceLink: PropTypes.any,
  /** method for using local storage */
  useLocalStorage: PropTypes.func.isRequired,
}
