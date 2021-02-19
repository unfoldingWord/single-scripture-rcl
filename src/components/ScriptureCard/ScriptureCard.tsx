import * as React from 'react'
import * as PropTypes from 'prop-types'
import { Card, useCardState } from 'translation-helps-rcl'
import { ScripturePane, ScriptureSelector } from '..'
import { updateTitle } from '../../utils/ScriptureVersionHistory'
import { useScriptureSettings } from '../../hooks/useScriptureSettings'
import { getScriptureVersionSettings } from '../../utils/ScriptureSettings'
import { Title } from '../ScripturePane/styled'

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
    // TODO: What are the next two lines useful for? Bruce McLean?
    const scriptureConfig_ = { ...scriptureConfig }
    scriptureConfig_.verseObjects = !!scriptureConfig.verseObjects
    const scriptureSelectionConfig = getScriptureVersionSettings({
      label,
      resourceLink: scriptureConfig.resourceLink,
      setScripture,
    })

    return <ScriptureSelector {...scriptureSelectionConfig} style={style} />
  }

  // @ts-ignore
  const language = getLanguage({ languageId: scriptureConfig?.resource?.languageId })
  const direction = (language?.direction) || 'ltr'
  const reference = { ...scriptureConfig.reference }

  if (scriptureConfig.matchedVerse) { // support verse ranges
    reference.verse = scriptureConfig.matchedVerse
  }

  const items = null
  const {
    state: {
      headers, filters, fontSize, itemIndex, markdownView,
    },
    actions: {
      setFilters, setFontSize, setItemIndex, setMarkdownView,
    },
  } = useCardState({ items })

  const refStyle = {
    fontFamily: 'Noto Sans',
    fontSize: `${Math.round(fontSize * 0.9)}%`,
  }

  const contentStyle = {
    fontFamily: 'Noto Sans',
    fontSize: `${fontSize}%`,
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
  /** Its new testament */
  isNT: PropTypes.func,
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
  /** useLocalStorage hook */
  useLocalStorage: PropTypes.func,
  /** resourceLink */
  resourceLink: PropTypes.any,
}
