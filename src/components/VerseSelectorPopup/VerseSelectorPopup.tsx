import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { DraggableCard } from 'translation-helps-rcl'
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { RxLink2, RxLinkBreak2 } from 'react-icons/rx'

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
  versesAlignmentStatus,
  onVerseSelect,
}) => {

  const renderedVerseItems = versesForRef.map(verse => {
    const isVerseAligned = versesAlignmentStatus?.[`${verse.chapter}:${verse.verse}`]
    let alignIcon = null
    if (isVerseAligned) {
      alignIcon = <RxLink2 id={`valid_icon_${resourceId}`} color='#BBB' />
    } else {
      alignIcon = <RxLinkBreak2 id={`invalid_alignment_icon_${resourceId}`} color='#000' />
    }

    return (
      <ListItem
        disablePadding
        id={`verse-${verse.chapter}:${verse.verse}`}
        key={`verse-${verse.chapter}:${verse.verse}`}
        onClick={(event) => {onVerseSelect(verse)}}
      >
        <ListItemButton>
          <ListItemIcon>
            {alignIcon}
          </ListItemIcon>
          <ListItemText primary={`${verse.chapter}:${verse.verse}`} />
        </ListItemButton>
      </ListItem>
    )
  })

  return (
    <Box id={`verse-list-${resourceId}`} sx={{ minWidth: '360px',maxWidth: '600px', bgcolor: 'background.paper' }}>
      <List>
        {renderedVerseItems}
      </List>
    </Box>
  )
}

const VerseSelectorPopup = ({ resourceId, versesForRef, versesAlignmentStatus, onVerseSelect, open, onClose }) => {
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
        <VerseSelectorContent
          resourceId={resourceId}
          versesForRef={versesForRef}
          versesAlignmentStatus={versesAlignmentStatus}
          onVerseSelect={onVerseSelect}
        />
      }
    />
  )
}

export default VerseSelectorPopup
