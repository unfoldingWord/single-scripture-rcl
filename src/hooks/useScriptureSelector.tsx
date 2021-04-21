// Based on Material UI Creatable example: https://material-ui.com/components/autocomplete/#creatable
// converted to headless

import * as React from 'react'
import HighlightOffIcon from '@material-ui/icons/HighlightOff'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { delay } from '../utils/delay'
import { useComboBox } from './useComboBox'

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
  /** callback function for when user makes deletes a scripture from options */
  deleteItem: Function,
  /** if truthy the label is initially shown in input box, otherwise current selection shown */
  initialPrompt: any | null,
}

export function useScriptureSelector({
  label,
  options,
  current,
  allowUserInput,
  onChange,
  deleteItem,
  initialPrompt,
}: Props) {
  function scriptureSelectorOnChange(newSelection, index) {
    onChange && onChange(newSelection, index, (success, item) => {
      console.log(`useScriptureSelector-scriptureSelectorOnChange(${JSON.stringify(newSelection)},${index}) - success: ${success}`)

      if (!success) {
        if (typeof newSelection === 'string') {
          deleteItem(newSelection)
        } else {
          console.log(`useScriptureSelector-scriptureSelectorOnChange() cannot delete item '${JSON.stringify(newSelection)}'`)
        }
      } else {
        makeSureItemIsSelectedInComboBox(item)
      }
    })
  }

  let { state, actions } = useComboBox({
    label,
    options,
    current,
    allowUserInput,
    onChange: scriptureSelectorOnChange,
    initialPrompt,
  })
  const [currentOptions, setOptions] = React.useState(state.options)

  function findTitle(title) {
    const index = currentOptions.findIndex(item => (item.title === title))
    return index
  }

  function makeSureItemIsSelectedInComboBox(item) {
    const title = item?.title

    if (title) {
      let index = findTitle(title)
      let selectedItem

      if (index < 0) { // if we need to add
        const newOptions = currentOptions
        newOptions.unshift(item)
        setOptions(newOptions)
        selectedItem = item
      } else {
        selectedItem = currentOptions[index]
      }
      actions.setValue(selectedItem) // select this item
    }
  }

  function handleDelete(option) {
    const currentTitle = state?.value?.title || ''
    const removeTitle = option.title
    deleteItem(removeTitle)
    const removeIndex = findTitle(removeTitle)
    const currentSelectionIndex = findTitle(currentTitle)

    if (removeIndex >= 0) {
      currentOptions[removeIndex].deleting = true // flag we are deleting before onChange called
      currentOptions.splice(removeIndex, 1)
      setOptions(currentOptions)

      if ((currentSelectionIndex < 0) || !currentTitle ||
        (currentTitle === removeTitle)) { // if we removed current or current already removed, we need to select another
        const newIndex = 0
        const newSelection = currentOptions[newIndex]
        onChange && onChange(newSelection.title, newIndex)
        actions.setValue(newSelection)
      } else { // reselect current item since race condition can leave wrong item shown selected
        if (currentSelectionIndex >= 0) {
          delay(50).then(() => {
            const currentSelection = currentOptions[currentSelectionIndex]
            actions.setValue(currentSelection.title)
            setOptions(currentOptions)
            onChange && onChange(currentSelection.title, currentSelectionIndex)
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
