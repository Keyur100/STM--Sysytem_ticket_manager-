import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import api from '../../../api/axios';

export default function CompanyEditModal({ open, onClose, companyId }) {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/saas/company/${companyId}`);
        if (mounted) setData(res.data || {});
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [open, companyId]);

  const update = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        url: data.url,
        panNo: data.panNo,
        gstNo: data.gstNo,
        contact: data.contact,
        code: data.code,
        taxSettings: data.taxSettings
      };
      await api.put(`/saas/company/${companyId}`, payload);
      onClose(true);
    } catch (e) {
      console.error('Failed to update company', e);
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <Dialog open={!!open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
      <DialogTitle>Edit Company</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField label="Name" value={data?.name || ''} onChange={e => setData({ ...data, name: e.target.value })} />
          <TextField label="Code" value={data?.code || ''} onChange={e => setData({ ...data, code: e.target.value })} />
          <TextField label="Email" value={data?.contact?.email || ''} onChange={e => setData({ ...data, contact: { ...data.contact, email: e.target.value } })} />
          <TextField label="Phone" value={data?.contact?.phone || ''} onChange={e => setData({ ...data, contact: { ...data.contact, phone: e.target.value } })} />
          <TextField label="URL" value={data?.url || ''} onChange={e => setData({ ...data, url: e.target.value })} />
          <TextField label="PAN" value={data?.panNo || ''} onChange={e => setData({ ...data, panNo: e.target.value })} />
          <TextField label="GST" value={data?.gstNo || ''} onChange={e => setData({ ...data, gstNo: e.target.value })} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button onClick={update} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
