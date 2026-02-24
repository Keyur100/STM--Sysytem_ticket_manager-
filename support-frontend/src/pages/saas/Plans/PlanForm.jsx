import React, { useEffect, useState } from 'react';
import { Box, Paper, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, CircularProgress, Alert } from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '../../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import usePermissions from '../../../helpers/hooks/usePermissions';

const schema = yup.object({
  code: yup.string().required('Code is required'),
  name: yup.string().required('Name is required'),
  billingCycle: yup.string().required('Billing cycle required'),
  price: yup.number().min(0),
});

export default function PlanForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(!isNew);
  const [, setError] = useState(null);

  const form = useFormik({
    initialValues: {
      code: '',
      name: '',
      description: '',
      billingCycle: 'MONTHLY',
      durationDays: '',
      price: 0,
      hasTax: true,
      taxIncluded: true,
      taxName: 'GST',
      planGroup: '',
      isActive: true,
      isSystem: false,
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      try {
        setError(null);
        const payload = { ...values, pricePaise: Math.round((values.price || 0) * 100) };
        if (isNew) await api.post('/saas/plan', payload);
        else await api.put(`/saas/plan/${id}`, payload);
        nav('/plans');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to save plan');
      }
    }
  });

  useEffect(() => {
    if (!isNew) {
      api.get(`/saas/plan/${id}`).then((res) => {
        const payload = res.data?.data || res.data;
        const p = payload || {};
        form.setValues({
          code: p.code || '',
          name: p.name || '',
          description: p.description || '',
          billingCycle: p.billingCycle || 'MONTHLY',
          durationDays: p.durationDays || '',
          price: (p.pricePaise || p.price || 0) / 100,
          hasTax: !!p.hasTax,
          taxIncluded: !!p.taxIncluded,
          taxName: p.taxName || 'GST',
          planGroup: p.planGroup || '',
          isActive: !!p.isActive,
          isSystem: !!p.isSystem,
        });
        setLoading(false);
      }).catch(() => { setError('Failed to load plan'); setLoading(false); });
    }
  }, [id]);

  if (loading) return <CircularProgress />;

  if (!isNew && !hasPermission('saas.plan_update')) return <Alert severity="error">You don't have permission to edit plans</Alert>;
  if (isNew && !hasPermission('saas.plan_create')) return <Alert severity="error">You don't have permission to create plans</Alert>;

  return (
    <Box p={2}>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={form.handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField name="code" label="Code" fullWidth value={form.values.code} onChange={form.handleChange} error={!!form.errors.code} helperText={form.errors.code} disabled={!isNew} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField name="name" label="Name" fullWidth value={form.values.name} onChange={form.handleChange} error={!!form.errors.name} helperText={form.errors.name} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Billing Cycle</InputLabel>
                <Select name="billingCycle" value={form.values.billingCycle} onChange={form.handleChange} label="Billing Cycle">
                  <MenuItem value="ONETIME">One-time</MenuItem>
                  <MenuItem value="DAILY">Daily</MenuItem>
                  <MenuItem value="WEEKLY">Weekly</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="HALF_YEARLY">Half-yearly</MenuItem>
                  <MenuItem value="YEARLY">Yearly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField name="price" label="Price (₹)" type="number" fullWidth value={form.values.price} onChange={form.handleChange} />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel control={<Switch name="isActive" checked={form.values.isActive} onChange={form.handleChange} />} label="Active" />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" type="submit">{isNew ? 'Create' : 'Update'}</Button>
                <Button variant="outlined" onClick={() => nav('/plans')}>Cancel</Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
