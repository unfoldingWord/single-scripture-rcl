import * as React from 'react'
import * as PropTypes from 'prop-types'
import { Card, useCardState } from 'translation-helps-rcl'
import { ScripturePane, ScriptureSelector } from '..'
import { updateTitle } from '../../utils/ScriptureVersionHistory'
import { useScriptureSettings } from '../../hooks/useScriptureSettings'
import { getScriptureVersionSettings } from '../../utils/ScriptureSettings'

const label = 'Version'
const style = { marginTop: '16px', width: '500px' }

export default function ScriptureCard(Props) {
  const {
    title,
    classes,
    getLanguage,
  } = Props

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
  const language = getLanguage({ languageId: scriptureConfig?.resource?.languageId })
  const direction = (language?.direction) || 'ltr'

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

  return (
    <Card
      title={title}
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
  /** repo branch such as master */
  branch: PropTypes.string.isRequired,
  /** resource language to use */
  languageId: PropTypes.string.isRequired,
  /** bookID to use */
  bookId: PropTypes.string.isRequired,
  /** resourceId to use (e.g. ugnt) */
  resourceId: PropTypes.string.isRequired,
  /** if true then word data hover is shown */
  disableWordPopover: PropTypes.bool,
  /** optional resource object */
  resource: PropTypes.object,
}
