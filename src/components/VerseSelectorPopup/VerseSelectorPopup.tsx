import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Typography from '@mui/material/Typography';
import { DraggableCard } from 'translation-helps-rcl'

const useStyles = makeStyles(theme => ({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    padding: theme.spacing(2),
  },
  button: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    alignSelf: 'flex-end',
  },
}))

const VerseSelectorContent = ({
  verseRefList,
  onVerseSelect,
}) => {
  const classes = useStyles()

  return (
   <div id='merge-card-content' className={classes.wrapper}>
      <Typography variant="body1" className={classes.row} >
        This will be a merge card
      </Typography>

      {/* TODO: This will be a list of verses */}
    </div>
  )
}

const VerseSelectorPopup = ({ resourceId, verseRefList, onVerseSelect, open, onClose }) => {
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
        <VerseSelectorContent verseRefList={verseRefList} onVerseSelect={onVerseSelect} />
      }
    />
  )
}

export default VerseSelectorPopup
