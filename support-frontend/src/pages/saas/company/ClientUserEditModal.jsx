import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box } from '@mui/material';
import api from '../../../api/axios';

export default function ClientUserEditModal({ open, onClose, userId }) {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/saas/client-users/${userId}`);
        const wrapper = res?.data || {};
        const payload = wrapper.data || wrapper;
        if (mounted) setData(payload.clientUser || payload || {});
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [open, userId]);

  const update = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload = { name: data.name, email: data.email, phone: data.phone, branchId: data.branchId, status: data.status };
      await api.put(`/saas/client-users/${userId}`, payload);
      onClose(true);
    } catch (e) {
      console.error('Failed to update client user', e);
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <Dialog open={!!open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
      <DialogTitle>Edit Client User</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Name" value={data?.name || ''} onChange={e => setData({ ...data, name: e.target.value })} />
          <TextField label="Email" value={data?.email || ''} onChange={e => setData({ ...data, email: e.target.value })} />
          <TextField label="Phone" value={data?.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} />
          <TextField label="Status" select value={data?.status || 'active'} onChange={e => setData({ ...data, status: e.target.value })}>
            <MenuItem value="active">active</MenuItem>
            <MenuItem value="inactive">inactive</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button onClick={update} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
