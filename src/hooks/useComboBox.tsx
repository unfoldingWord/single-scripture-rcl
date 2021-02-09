// Based on Material UI Creatable example: https://material-ui.com/components/autocomplete/#creatable
// converted to headless

import * as React from 'react'
import TextField from '@material-ui/core/TextField'
import { createFilterOptions } from '@material-ui/lab/Autocomplete'

const filter = createFilterOptions()

export function useComboBox({
  label, options, current, allowUserInput, onChange,
}) {
  const currentOption = ((current >= 0) && (current < options.length)) ? options[current] : ''
  const [value, setValue] = React.useState(currentOption)

  const handleChange = (event, newValue) => {
    let newSelection = newValue

    if (typeof newValue === 'string') {
      setValue({ title: newValue })
    } else if (newValue && newValue.inputValue) {
      // Create a new value from the user input
      setValue({ title: newValue.inputValue })
      newSelection = newValue.inputValue
    } else {
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
        title: `Add "${params.inputValue}"`,
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
