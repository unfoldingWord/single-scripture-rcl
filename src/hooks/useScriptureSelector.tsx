// Based on Material UI Creatable example: https://material-ui.com/components/autocomplete/#creatable
// converted to headless

import * as React from 'react'
import HighlightOffIcon from '@material-ui/icons/HighlightOff'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { delay } from '../utils/delay'
import { useComboBox } from './useComboBox'

export function useScriptureSelector({
  label, options, current, allowUserInput, onChange, deleteItem,
}) {
  let { state, actions } = useComboBox({
    label, options, current, allowUserInput, onChange,
  })
  const [currentOptions, setOptions] = React.useState(state.options)

  function findTitle(title) {
    const index = currentOptions.findIndex(item => (item.title === title))
    return index
  }

  function handleDelete(option) {
    const currentTitle = state.value.title
    const removeTitle = option.title
    deleteItem(removeTitle)
    const index = findTitle(removeTitle)

    if (index >= 0) {
      currentOptions[index].deleting = true // flag we are deleting before onChange called
      currentOptions.splice(index, 1)
      setOptions(currentOptions)

      if (currentTitle === removeTitle) { // if we removed current, we need to select another
        const newIndex = 0
        const newSelection = currentOptions[newIndex]
        actions.setValue(newSelection)
        onChange && onChange(newSelection.title, newIndex)
      } else { // reselect current item since race condition can leave wrong item shown selected
        const index = findTitle(currentTitle)

        if (index >= 0) {
          delay(50).then(() => {
            const currentSelection = currentOptions[index]
            actions.setValue(currentSelection.title)
            setOptions(currentOptions)
            onChange && onChange(currentSelection.title, index)
          })
        }
      }
    }
  }

  const renderOption = (option) => {
    return <React.Fragment>
      {option.title}
      {option.userAdded &&
      <Tooltip title="Remove">
        <IconButton aria-label="delete" onClick={() => {
          handleDelete(option)
        }}>
          <HighlightOffIcon />
        </IconButton>
      </Tooltip>
      }
    </React.Fragment>
  }

  return {
    state: {
      value: state.value,
      options: currentOptions,
      filterOptions: state.filterOptions,
      getOptionLabel: state.getOptionLabel,
      renderOption,
      renderInput: state.renderInput,
      freeSolo: state.freeSolo,
    },
    actions: { onChange: actions.onChange },
  }
}
