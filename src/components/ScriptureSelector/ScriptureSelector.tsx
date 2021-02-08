/* eslint-disable no-use-before-define */

// Based on Material UI Creatable example: https://material-ui.com/components/autocomplete/#creatable
// converted to headless

import * as React from 'react'
import Autocomplete from '@material-ui/lab/Autocomplete'
import * as PropTypes from 'prop-types'
import { useScriptureSelector } from '../../hooks'

export function ScriptureSelector({
  label, options, current, allowUserInput, onChange, style, deleteItem,
}) {
  const { status, actions } = useScriptureSelector({
    label, options, current, allowUserInput, onChange, deleteItem,
  })

  return (
    <Autocomplete
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      id="settings-combo-box"
      style={ style || { marginTop: '16px', width: '500px' }}
      { ...status }
      { ...actions }
    />
  )
}

// {, , , allowUserInput, }
ScriptureSelector.propTypes = {
  /** array of choices to show in dropdown. To give flexibility in data sources, each item is an object and only the title member is required to show the user */
  options: PropTypes.array.isRequired,
  /** The Prompt */
  label: PropTypes.string.isRequired,
  /** callback function when a new selection is made */
  onChange: PropTypes.func,
  /** index of current selection (optional - default is no selection) */
  current: PropTypes.number,
  /** if true then the user can type in anything and add as selection (optional - default is false) */
  allowUserInput: PropTypes.bool,
  /** style to use for comboBox (optional) */
  style: PropTypes.object,
  /** callback function when a scripture resource is to be removed from memory */
  deleteItem: PropTypes.func,
}

export default ScriptureSelector