import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { DraggableCard } from 'translation-helps-rcl'
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { BiBible } from 'react-icons/bi'

const useStyles = makeStyles(theme => ({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  list: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  button: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    alignSelf: 'flex-end',
  },
}))

const VerseSelectorContent = ({
  resourceId,
  versesForRef,
  onVerseSelect,
}) => {
  const renderedVerseItems = versesForRef.map(verse => {
    return (
      <ListItem
        disablePadding
        id={`verse-${verse.chapter}:${verse.verse}`}
        key={`verse-${verse.chapter}:${verse.verse}`}
        onClick={(event) => {onVerseSelect(verse)}}
      >
        <ListItemButton>
          <ListItemIcon>
            <BiBible />
          </ListItemIcon>
          <ListItemText primary={`${verse.chapter}:${verse.verse}`} />
        </ListItemButton>
      </ListItem>
    )
  })

  return (
    <Box id={`verse-list-${resourceId}`} sx={{ width: '50vh', bgcolor: 'background.paper' }}>
      {renderedVerseItems}
    </Box>
  )
}

const VerseSelectorPopup = ({ resourceId, versesForRef, onVerseSelect, open, onClose }) => {
  return (

    <DraggableCard
      id={`verse-selector-popup-${resourceId}`}
      title="Select Verse to Align"
      open={open}
      showRawContent
      initialPosition={{ x: 0, y: -10 }}
      // workspaceRef={mainScreenRef}
      onClose={onClose}
      dimBackground={true}
      content={
        <VerseSelectorContent resourceId={resourceId} versesForRef={versesForRef} onVerseSelect={onVerseSelect} />
      }
    />
  )
}

export default VerseSelectorPopup
