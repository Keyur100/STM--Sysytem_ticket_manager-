import React, { useEffect, useState } from 'react';
import { Box, Paper, Button, Typography } from '@mui/material';
import RequiredTextField from '../../../components/form/RequiredTextField';
import api from '../../../api/axios';

export default function BranchAdminForm({ companyId, branchId, onSaved }) {
  const [admin, setAdmin] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Optionally fetch existing branch data if branchId provided
    if (!companyId || !branchId) return;
    (async () => {
      try {
        const res = await api.get(`/saas/branch/${branchId}`);
        const b = res.data?.branch || res.data;
        if (b && b.admins && b.admins.length) setAdmin(b.admins[0]);
      } catch (e) {
        // ignore
      }
    })();
  }, [companyId, branchId]);

  const handleChange = (e) => setAdmin({ ...admin, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setError(null);
    if (!admin.name || !admin.email) return setError('Name and email required');
    setLoading(true);
    try {
      const res = await api.put(`/saas/company/${companyId}/branch/${branchId}/admin`, { branchId, admin });
      onSaved && onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Branch Admin</Typography>
      {error && <Box sx={{ color: 'red', mb: 1 }}>{error}</Box>}
      <Box sx={{ display: 'grid', gap: 12 }}>
        <RequiredTextField formik={null} name="name" label="Name" required value={admin.name} onChange={handleChange} />
        <RequiredTextField formik={null} name="email" label="Email" required value={admin.email} onChange={handleChange} />
        <RequiredTextField formik={null} name="phone" label="Phone" value={admin.phone} onChange={handleChange} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => setAdmin({ name: '', email: '', phone: '' })}>Reset</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </Box>
      </Box>
    </Paper>
  );
}
