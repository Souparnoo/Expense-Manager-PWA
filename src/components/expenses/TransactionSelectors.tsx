import React, { useState } from 'react';
import {
  Box, TextField, MenuItem, InputAdornment, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Checkbox, Button, Avatar, Divider, Typography
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { useApp } from '../../hooks/useApp';
import { useTour } from '../../hooks/useTour';

// Sentinel: clicking this in the dropdown opens the person-picker popup
const MULTI_SENTINEL = '__multi__';

export default function TransactionSelectors() {
  const {
    friends,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor, selectedPaidForMulti,
    setSelectedDate, setSelectedTime, setSelectedPaidBy, setSelectedPaidFor, setSelectedPaidForMulti,
    notifyPaidByTouched, notifyPaidForTouched
  } = useApp();

  const activeFriends = friends.filter(f => f.active);
  const [multiDialogOpen, setMultiDialogOpen] = useState(false);
  // draftSelection includes 'me' as a possible entry alongside friend IDs
  const [draftSelection, setDraftSelection] = useState<string[]>([]);
  const { onPaidForOpened, onMultiSelectChosen, onMultiSelectConfirmed, phase } = useTour();

  const isMultiActive = selectedPaidForMulti.length > 0;

  const handlePaidByChange = (value: string) => {
    notifyPaidByTouched();
    setSelectedPaidBy(value);
    if (value !== 'me') {
      setSelectedPaidFor('me');
      setSelectedPaidForMulti([]);
    }
  };

  const handlePaidForChange = (value: string) => {
    notifyPaidForTouched();
    if (value === MULTI_SENTINEL) {
      if (phase === 'p4-paid-for-open') onMultiSelectChosen();
      // Pre-fill popup with current selection
      const current = isMultiActive
        ? selectedPaidForMulti
        : selectedPaidFor === 'me'
          ? ['me']
          : [selectedPaidFor];
      setDraftSelection(current);
      setMultiDialogOpen(true);
      return;
    }
    setSelectedPaidForMulti([]);
    setSelectedPaidFor(value);
    if (value !== 'me') setSelectedPaidBy('me');
  };

  const togglePerson = (id: string) => {
    setDraftSelection(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmMulti = () => {
    notifyPaidForTouched();
    if (draftSelection.length === 0) {
      setMultiDialogOpen(false);
      return;
    }

    if (draftSelection.length === 1) {
      // Single selection — use normal single-select mode
      const only = draftSelection[0];
      setSelectedPaidForMulti([]);
      setSelectedPaidFor(only);
      if (only !== 'me') setSelectedPaidBy('me');
    } else {
      // Multiple people selected — multi mode
      setSelectedPaidForMulti(draftSelection);
      setSelectedPaidBy('me');
      setSelectedPaidFor('me'); // kept harmless while multi is active
      if (phase === 'p4-paid-for-checkbox') onMultiSelectConfirmed();
    }
    setMultiDialogOpen(false);
  };

  const isPaidByLocked = selectedPaidFor !== 'me' || isMultiActive;
  const isPaidForLocked = selectedPaidBy !== 'me';

  const paidForDisplayValue = isMultiActive ? MULTI_SENTINEL : selectedPaidFor;

  // Human-readable labels for the multi chip
  const multiLabels = selectedPaidForMulti.map(id =>
    id === 'me' ? 'Me' : activeFriends.find(f => f.id === id)?.name ?? id
  );

  // Summary display for the dropdown when multi is active
  const multiSummary = multiLabels.length <= 3
    ? multiLabels.join(', ')
    : `${multiLabels.slice(0, 2).join(', ')} +${multiLabels.length - 2} more`;

  return (
    <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

      {/* Date & Time */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <TextField
          label="Date" type="date" size="small" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><CalendarTodayIcon fontSize="small" /></InputAdornment> }}
          InputLabelProps={{ shrink: true }} fullWidth
        />
        <TextField
          label="Time" type="time" size="small" value={selectedTime}
          onChange={e => setSelectedTime(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><AccessTimeIcon fontSize="small" /></InputAdornment> }}
          InputLabelProps={{ shrink: true }} fullWidth
        />
      </Box>

      {/* Paid By & Paid For */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>

        <Box data-tour="paid-by">
          <TextField
            label="Paid By" select size="small"
            value={selectedPaidBy}
            onChange={e => handlePaidByChange(e.target.value)}
            disabled={isPaidByLocked}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }}
            fullWidth
          >
            <MenuItem value="me">Me</MenuItem>
            {activeFriends.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </TextField>
        </Box>

        <Box data-tour="paid-for">
          <TextField
            label="Paid For" select size="small"
            value={paidForDisplayValue}
            onChange={e => handlePaidForChange(e.target.value)}
            disabled={isPaidForLocked}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {isMultiActive ? <GroupIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                </InputAdornment>
              )
            }}
            fullWidth
            SelectProps={{
              onOpen: () => { if (phase === 'p4-home-paid-for') onPaidForOpened(); },
              renderValue: () =>
                isMultiActive
                  ? multiSummary
                  : (selectedPaidFor === 'me' ? 'Me' : activeFriends.find(f => f.id === selectedPaidFor)?.name ?? 'Me')
            }}
          >
            <MenuItem value="me">Me</MenuItem>
            {activeFriends.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            {activeFriends.length > 0 && [
              <Divider key="div" />,
              <MenuItem key={MULTI_SENTINEL} value={MULTI_SENTINEL}
                data-tour="multi-select-option"
                sx={{ color: 'primary.main', fontWeight: 600 }}>
                <GroupIcon fontSize="small" sx={{ mr: 1 }} />
                Select multiple people…
              </MenuItem>
            ]}
          </TextField>
        </Box>
      </Box>

      {/* Info chip */}
      {isMultiActive ? (
        <Box data-tour="paid-for-chips" sx={{ display: 'flex', justifyContent: 'center' }}>
          <Chip
            size="small" color="primary"
            icon={<GroupIcon sx={{ fontSize: '16px !important' }} />}
            label={`Recording for: ${multiLabels.join(', ')}`}
            onClick={() => {
              setDraftSelection(selectedPaidForMulti);
              setMultiDialogOpen(true);
            }}
            onDelete={() => {
              setSelectedPaidForMulti([]);
              setSelectedPaidFor('me');
            }}
            sx={{ fontWeight: 600, maxWidth: '100%', cursor: 'pointer',
              '& .MuiChip-label': { whiteSpace: 'normal' } }}
          />
        </Box>
      ) : (selectedPaidBy !== 'me' || selectedPaidFor !== 'me') && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Chip
            size="small"
            color={selectedPaidBy !== 'me' ? 'warning' : 'info'}
            label={
              selectedPaidBy !== 'me'
                ? `${activeFriends.find(f => f.id === selectedPaidBy)?.name} paid for you`
                : `You paid for ${activeFriends.find(f => f.id === selectedPaidFor)?.name}`
            }
            sx={{ fontWeight: 600 }}
          />
        </Box>
      )}

      {/* Person-picker popup — Me is also a selectable option here */}
      <Dialog open={multiDialogOpen} onClose={() => setMultiDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon color="primary" />
            Select people
          </Box>
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', fontWeight: 400, mt: 0.5 }}>
            Each selected person gets their own expense entry for the same amount — ideal when everyone had the same thing.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, maxHeight: 380, overflowY: 'auto' }}>
          <List data-tour="paid-for-checkboxes" disablePadding>
            {/* Me as first checkbox option */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => togglePerson('me')} dense>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox edge="start" checked={draftSelection.includes('me')} tabIndex={-1} disableRipple />
                </ListItemIcon>
                <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', mr: 1.5, bgcolor: 'secondary.main' }}>
                  M
                </Avatar>
                <ListItemText primary="Me" secondary="yourself" />
              </ListItemButton>
            </ListItem>

            {activeFriends.length > 0 && <Divider />}

            {activeFriends.map(f => (
              <ListItem key={f.id} disablePadding>
                <ListItemButton onClick={() => togglePerson(f.id)} dense>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox edge="start" checked={draftSelection.includes(f.id)} tabIndex={-1} disableRipple />
                  </ListItemIcon>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', mr: 1.5, bgcolor: 'primary.main' }}>
                    {f.name[0]}
                  </Avatar>
                  <ListItemText primary={f.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {draftSelection.length} selected
          </Typography>
          <Button onClick={() => setMultiDialogOpen(false)} color="inherit" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirmMulti} variant="contained" disabled={draftSelection.length === 0}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}