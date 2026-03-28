import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Box } from '@mui/material';
import api from '../../../api/axios';
import ClientUserEditModal from './ClientUserEditModal';

export default function ManageClientsModal({ open, onClose, companyId }) {
  const [clients, setClients] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const fetchAll = async () => {
    try {
      // request all clients (server supports ?all=true)
      const res = await api.get(`/saas/company/${companyId}/client-users`, { params: { all: true } });
      setClients(res.data.clientUsers || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (open) fetchAll(); }, [open]);

  return (
    <>
      <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>Manage Clients</DialogTitle>
        <DialogContent dividers>
          <List>
            {clients.map(c => (
              <ListItem key={c._id} secondaryAction={<Button size="small" onClick={() => setEditingId(c._id)}>Edit</Button>}>
                <ListItemText primary={c.name} secondary={`${c.email || '-'} • ${c.phone || '-'}`} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <ClientUserEditModal open={!!editingId} onClose={(saved) => { setEditingId(null); if (saved) fetchAll(); }} userId={editingId} />
    </>
  );
}
