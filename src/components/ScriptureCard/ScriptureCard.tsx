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

export default function ScriptureCard(Props) {
  const {
    classes,
    getLanguage,
    useLocalStorage,
    cardNum,
  } = Props

  const [fontSize, setFontSize] = useLocalStorage(KEY_FONT_SIZE_BASE + cardNum, 100)
  const { scriptureConfig, setScripture } = useScriptureSettings(Props)

  if (scriptureConfig.title) {
    const title = `${scriptureConfig.title} v${scriptureConfig.version}`
    updateTitle(scriptureConfig.resourceLink, title)
  }

  /** dynamically creates the scripture selection dropdown to be inserted into card settings */
  function getScriptureSelector() {
    const scriptureConfig_ = { ...scriptureConfig }
    scriptureConfig_.content = !!scriptureConfig.content
    const scriptureSelectionConfig = getScriptureVersionSettings({
      label,
      resourceLink: scriptureConfig.resourceLink,
      setScripture,
    })

    return <ScriptureSelector {...scriptureSelectionConfig} style={style} />
  }

  // @ts-ignore
  const languageId = scriptureConfig?.resource?.languageId
  const language = getLanguage({ languageId })
  const direction = (language?.direction) || 'ltr'
  const reference = { ...scriptureConfig.reference }

  const isHebrew = (languageId === 'hbo')
  const fontFactor = isHebrew ? 1.4 : 1 // we automatically bump up font size for Hebrew

  const scaledFontSize = fontSize * fontFactor
  console.log(`fontSize=${scaledFontSize}`)
  console.log(`fontSize_=${fontSize}`)
  console.log(`languageId=${languageId}`)

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

  const labelStyle = {
    fontFamily: 'Noto Sans',
    fontSize: `16px`,
    maxWidth: '100%',
  }

  const refStyle = {
    fontFamily: 'Noto Sans',
    fontSize: `${Math.round(scaledFontSize * 0.9)}%`,
  }

  const contentStyle = {
    fontFamily: 'Noto Sans',
    fontSize: `${scaledFontSize}%`,
  }

  const scriptureLabel =
    <Title style={labelStyle}>{scriptureConfig.title} v{scriptureConfig.version}</Title>

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
      hideMarkdownToggle
      getCustomComponent={getScriptureSelector}
    >
      <ScripturePane
        refStyle={refStyle}
        contentStyle={contentStyle}
        {...scriptureConfig}
        reference={reference}
        direction={direction}
      />
    </Card>
  )
}

ScriptureCard.propTypes = {
  /** scripture card number (0 to 2 for example) */
  cardNum: PropTypes.number.isRequired,
  /** title for scripture card */
  title: PropTypes.string.isRequired,
  /** current chapter number */
  chapter: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  /** current verse number */
  verse: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  /** server (e.g. 'https://git.door43.org') */
  server: PropTypes.string.isRequired,
  /** repo owner such as unfoldingWord */
  owner: PropTypes.string.isRequired,
  /** repo owner for original languages such as unfoldingWord */
  originalLanguageOwner: PropTypes.string.isRequired,
  /** repo branch such as master */
  branch: PropTypes.string.isRequired,
  /** resource language to use */
  languageId: PropTypes.string.isRequired,
  /** get language details */
  getLanguage: PropTypes.func.isRequired,
  /** bookID to use */
  bookId: PropTypes.string.isRequired,
  /** resourceId to use (e.g. ugnt) */
  resourceId: PropTypes.string.isRequired,
  /** if true then word data hover is shown */
  disableWordPopover: PropTypes.bool,
  /** optional resource object */
  resource: PropTypes.object,
  /** method for testing bookId to determine if NT or OT */
  isNT: PropTypes.func.isRequired,
  /** method for using local storage */
  useLocalStorage: PropTypes.func.isRequired,
}
