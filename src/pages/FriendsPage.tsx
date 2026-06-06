import React, { useState } from 'react';
import {
  Box, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Chip, Switch, FormControlLabel,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useApp } from '../hooks/useApp';
import * as db from '../db';
import { generateId, formatCurrency, calcFriendBalances } from '../utils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import type { Friend } from '../types';

export default function FriendsPage() {
  const { friends, expenses, settlements, settings, reloadFriends } = useApp();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Friend | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const balances = calcFriendBalances(expenses, settlements, friends);

  const openAdd = () => {
    setEditing(null);
    setNameInput('');
    setOpen(true);
  };

  const openEdit = (f: Friend) => {
    setEditing(f);
    setNameInput(f.name);
    setOpen(true);
  };

  const handleSave = async () => {
    const name = nameInput.trim();
    if (!name) return;
    const friend: Friend = {
      id: editing?.id || generateId(),
      name,
      active: editing?.active ?? true,
      createdAt: editing?.createdAt || Date.now()
    };
    await db.saveFriend(friend);
    await reloadFriends();
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // NOTE: We do NOT delete expenses/settlements — historical data preserved
    await db.deleteFriend(deleteId);
    await reloadFriends();
    setDeleteId(null);
  };

  const handleToggleActive = async (friend: Friend) => {
    await db.saveFriend({ ...friend, active: !friend.active });
    await reloadFriends();
    setDeactivateId(null);
  };

  const activeFriends = friends.filter(f => f.active);
  const inactiveFriends = friends.filter(f => !f.active);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Friends" subtitle={`${activeFriends.length} active`} />

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10 }}>
        {friends.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon />}
            title="No Friends Yet"
            subtitle="Add friends to track shared expenses and settlements."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                Add Friend
              </Button>
            }
          />
        ) : (
          <>
            {activeFriends.length > 0 && (
              <List sx={{ px: 1 }}>
                {activeFriends.map(f => {
                  const bal = balances.find(b => b.friend.id === f.id);
                  const net = bal?.net ?? 0;
                  return (
                    <ListItem
                      key={f.id}
                      sx={{
                        borderRadius: 2, mb: 0.5,
                        backgroundColor: 'action.hover'
                      }}
                    >
                      <ListItemText
                        primary={<Typography fontWeight={600}>{f.name}</Typography>}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.25, flexWrap: 'wrap' }}>
                            {net === 0 ? (
                              <Chip size="small" label="Settled up" color="success" variant="outlined" />
                            ) : net > 0 ? (
                              <Chip size="small" label={`You owe ${formatCurrency(net, settings.currency)}`} color="warning" variant="outlined" />
                            ) : (
                              <Chip size="small" label={`${f.name} owes ${formatCurrency(Math.abs(net), settings.currency)}`} color="info" variant="outlined" />
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => openEdit(f)} sx={{ mr: 0.5 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeactivateId(f.id)}>
                          <PersonOffIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteId(f.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}

            {inactiveFriends.length > 0 && (
              <>
                <Divider sx={{ my: 1, mx: 2 }}>
                  <Typography variant="caption" color="text.disabled">INACTIVE</Typography>
                </Divider>
                <List sx={{ px: 1 }}>
                  {inactiveFriends.map(f => (
                    <ListItem
                      key={f.id}
                      sx={{ borderRadius: 2, mb: 0.5, opacity: 0.6 }}
                    >
                      <ListItemText
                        primary={<Typography fontWeight={500} color="text.secondary">{f.name}</Typography>}
                        secondary="Inactive"
                      />
                      <ListItemSecondaryAction>
                        <Button size="small" onClick={() => handleToggleActive(f)}>
                          Reactivate
                        </Button>
                        <IconButton size="small" color="error" onClick={() => setDeleteId(f.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </>
        )}
      </Box>

      <Fab color="primary" onClick={openAdd} sx={{ position: 'fixed', bottom: 80, right: 20 }}>
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Friend' : 'Add Friend'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name" value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            fullWidth size="small" autoFocus sx={{ mt: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">{editing ? 'Save' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate Friend"
        message="This friend won't be available for new transactions. All history is preserved."
        confirmText="Deactivate"
        confirmColor="warning"
        onConfirm={() => {
          const f = friends.find(f => f.id === deactivateId);
          if (f) handleToggleActive(f);
        }}
        onCancel={() => setDeactivateId(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Friend"
        message="This will remove the friend. Historical expenses and settlements remain intact."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
