import React from 'react';
import {
  Box, TextField, MenuItem, InputAdornment, Chip
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import { useApp } from '../../hooks/useApp';

export default function TransactionSelectors() {
  const {
    friends,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor,
    setSelectedDate, setSelectedTime, setSelectedPaidBy, setSelectedPaidFor
  } = useApp();

  const activeFriends = friends.filter(f => f.active);

  const handlePaidByChange = (value: string) => {
    setSelectedPaidBy(value);
    if (value !== 'me') {
      // Friend pays → Paid For must be Me, locked
      setSelectedPaidFor('me');
    }
  };

  const handlePaidForChange = (value: string) => {
    setSelectedPaidFor(value);
    if (value !== 'me') {
      // I pay for friend → Paid By must be Me, locked
      setSelectedPaidBy('me');
    }
  };

  const isPaidByLocked = selectedPaidFor !== 'me';
  const isPaidForLocked = selectedPaidBy !== 'me';

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
          value={selectedPaidFor}
          onChange={e => handlePaidForChange(e.target.value)}
          disabled={isPaidForLocked}
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
      </Box>

      {/* Transaction info chip */}
      {(selectedPaidBy !== 'me' || selectedPaidFor !== 'me') && (
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
    </Box>
  );
}
