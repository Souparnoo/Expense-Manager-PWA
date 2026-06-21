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

// Sentinel value shown as the last option in the Paid For dropdown —
// selecting it opens the multi-select popup instead of picking a single friend.
const MULTI_SENTINEL = '__multi__';

export default function TransactionSelectors() {
  const {
    friends,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor, selectedPaidForMulti,
    setSelectedDate, setSelectedTime, setSelectedPaidBy, setSelectedPaidFor, setSelectedPaidForMulti
  } = useApp();

  const activeFriends = friends.filter(f => f.active);
  const [multiDialogOpen, setMultiDialogOpen] = useState(false);
  const [draftSelection, setDraftSelection] = useState<string[]>([]);

  const isMultiActive = selectedPaidForMulti.length > 0;

  const handlePaidByChange = (value: string) => {
    setSelectedPaidBy(value);
    if (value !== 'me') {
      // Friend pays → Paid For must be Me, locked, and multi-select doesn't apply
      setSelectedPaidFor('me');
      setSelectedPaidForMulti([]);
    }
  };

  const handlePaidForChange = (value: string) => {
    if (value === MULTI_SENTINEL) {
      // Open the popup, pre-filling with whatever was last chosen (or just
      // the current single selection as a starting point)
      setDraftSelection(selectedPaidForMulti.length > 0 ? selectedPaidForMulti : []);
      setMultiDialogOpen(true);
      return;
    }
    setSelectedPaidForMulti([]); // leaving multi mode
    setSelectedPaidFor(value);
    if (value !== 'me') {
      // I pay for a friend → Paid By must be Me, locked
      setSelectedPaidBy('me');
    }
  };

  const toggleDraftFriend = (friendId: string) => {
    setDraftSelection(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleConfirmMulti = () => {
    if (draftSelection.length === 0) {
      // Nothing picked — treat as cancel, fall back to single 'me'
      setMultiDialogOpen(false);
      return;
    }
    if (draftSelection.length === 1) {
      // Only one friend selected — no need for multi mode, behaves like normal single-select
      setSelectedPaidForMulti([]);
      setSelectedPaidFor(draftSelection[0]);
    } else {
      setSelectedPaidForMulti(draftSelection);
      setSelectedPaidFor('me'); // not used while multi is active, kept harmless
    }
    setSelectedPaidBy('me'); // multi-pay only makes sense when I'm the one paying
    setMultiDialogOpen(false);
  };

  const isPaidByLocked = selectedPaidFor !== 'me' || isMultiActive;
  const isPaidForLocked = selectedPaidBy !== 'me';

  // What the Paid For field displays — special label when multi is active
  const paidForDisplayValue = isMultiActive ? MULTI_SENTINEL : selectedPaidFor;

  const multiNames = selectedPaidForMulti
    .map(id => activeFriends.find(f => f.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Date & Time Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <TextField
          label="Date"
          type="date"
          size="small"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarTodayIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label="Time"
          type="time"
          size="small"
          value={selectedTime}
          onChange={e => setSelectedTime(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccessTimeIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Box>

      {/* Paid By & Paid For Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <TextField
          label="Paid By"
          select
          size="small"
          value={selectedPaidBy}
          onChange={e => handlePaidByChange(e.target.value)}
          disabled={isPaidByLocked}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          fullWidth
        >
          <MenuItem value="me">Me</MenuItem>
          {activeFriends.map(f => (
            <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Paid For"
          select
          size="small"
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
            renderValue: () =>
              isMultiActive
                ? `Me + ${selectedPaidForMulti.length} friend${selectedPaidForMulti.length > 1 ? 's' : ''}`
                : (selectedPaidFor === 'me' ? 'Me' : activeFriends.find(f => f.id === selectedPaidFor)?.name ?? 'Me')
          }}
        >
          <MenuItem value="me">Me</MenuItem>
          {activeFriends.map(f => (
            <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
          ))}
          {activeFriends.length > 0 && [
            <Divider key="multi-divider" />,
            <MenuItem key={MULTI_SENTINEL} value={MULTI_SENTINEL} sx={{ color: 'primary.main', fontWeight: 600 }}>
              <GroupIcon fontSize="small" sx={{ mr: 1 }} />
              Me + Multiple Friends…
            </MenuItem>
          ]}
        </TextField>
      </Box>

      {/* Transaction info chip(s) */}
      {isMultiActive ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
          <Chip
            size="small"
            color="primary"
            icon={<GroupIcon sx={{ fontSize: '16px !important' }} />}
            label={`Same amount for: Me, ${multiNames.join(', ')}`}
            onDelete={() => setMultiDialogOpen(true)}
            deleteIcon={<Typography variant="caption" sx={{ px: 0.5, fontWeight: 700 }}>Edit</Typography>}
            sx={{ fontWeight: 600, maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal' } }}
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

      {/* Multi-select popup */}
      <Dialog open={multiDialogOpen} onClose={() => setMultiDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon color="primary" />
            Split Same Amount Among
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 400, mt: 0.5 }}>
            Each person gets their own entry for the full amount you'll enter below — useful when everyone ordered the same thing.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, maxHeight: 360 }}>
          <List disablePadding>
            {activeFriends.map(f => {
              const checked = draftSelection.includes(f.id);
              return (
                <ListItem key={f.id} disablePadding>
                  <ListItemButton onClick={() => toggleDraftFriend(f.id)} dense>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', mr: 1.5, bgcolor: 'primary.main' }}>
                      {f.name[0]}
                    </Avatar>
                    <ListItemText primary={f.name} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {draftSelection.length} selected
          </Typography>
          <Button onClick={() => setMultiDialogOpen(false)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleConfirmMulti} variant="contained" disabled={draftSelection.length === 0}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}