// Based on Material UI Creatable example: https://material-ui.com/components/autocomplete/#creatable
// converted to headless

import * as React from 'react'
import TextField from '@material-ui/core/TextField'
import { createFilterOptions } from '@material-ui/lab/Autocomplete'

const filter = createFilterOptions()

interface Props {
  /** text to display in input box */
  label: string,
  /** array of options to show in dropdown */
  options: any[],
  /** array index into options of current selection */
  current: number,
  /** if true then user can type in any text */
  allowUserInput: boolean,
  /** callback function for when user makes a selection */
  onChange: Function,
  /** if truthy the label is initially shown in input box, otherwise current selection shown */
  initialPrompt: any | null,
}

export function useComboBox({
  label,
  options,
  current,
  allowUserInput,
  onChange,
  initialPrompt,
}: Props) {
  const currentOption = ((current >= 0) && (current < options.length)) ? options[current] : ''
  const [value, setValue] = React.useState(initialPrompt ? null : currentOption)

  const handleChange = (event, newValue) => {
    let newSelection = newValue

    if (typeof newValue === 'string') {
      newSelection = newValue.trim()
      setValue({ title: newSelection })
    } else if (newValue && newValue.inputValue) {
      // Create a new value from the user input
      newSelection = newValue.inputValue.trim()
      setValue({ title: newSelection })
    } else {
      if (newValue?.title) {
        newValue.title = newValue.title.trim()
      }
      setValue(newValue)
      newSelection = newValue?.title
    }

    const index = options.findIndex(option => (option.title === newSelection))
    onChange && onChange(newSelection, index)
  }

  const filterOptions = (options, params) => {
    const filtered = filter(options, params)

    // Suggest the creation of a new value
    if (params.inputValue !== '') {
      filtered.push({
        inputValue: params.inputValue,
        title: `Add "${params.inputValue.trim()}"`,
      })
    }

    return filtered
  }

  const getOptionLabel = (option) => {
    // Value selected with enter, right from the input
    if (typeof option === 'string') {
      return option
    }

    // Add "xxx" option created dynamically
    if (option.inputValue) {
      return option.inputValue
    }
    // Regular option
    return option.title
  }

  const renderOption = (option) => option.title

  const renderInput = (params) => (
    <TextField {...params} label={label} variant="outlined" />
  )

  return {
    state: {
      value,
      options,
      filterOptions,
      getOptionLabel,
      renderOption,
      renderInput,
      freeSolo: !!allowUserInput,
    },
    actions: {
      onChange: handleChange,
      setValue,
    },
  }
}
