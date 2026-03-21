import React, { useEffect, useState } from 'react';
import { Box, Paper, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, Checkbox, Typography } from '@mui/material';
import RequiredTextField from '../../../components/form/RequiredTextField';
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
  const [modules, setModules] = useState([]);
  const [planPayload, setPlanPayload] = useState(null);
  const [moduleSearch, setModuleSearch] = useState("");
  const [filteredModuleKeys, setFilteredModuleKeys] = useState(null);

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
        // convert internal `enabled` -> API `visible` before submit
        const modulePermissionsForApi = (values.modulePermissions || []).map((m) => ({
          moduleKey: m.moduleKey,
          displayName: m.displayName,
          visible: typeof m.visible !== 'undefined' ? !!m.visible : (m.actions || []).some((a) => !!a.enabled),
          actions: (m.actions || []).map((a) => ({ key: a.key, visible: !!a.enabled })),
        }));

        const payload = { ...values, pricePaise: Math.round((values.price || 0) * 100), modulePermissions: modulePermissionsForApi };
        if (isNew) await api.post('/saas/plan', payload);
        else await api.put(`/saas/plan/${id}`, payload);
        nav('/plans');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to save plan');
      }
    }
  });

  useEffect(() => {
    // fetch modules first (used for permission UI)
    (async () => {
      try {
        // fetch a large limit so UI can display all modules; backend supports pagination/search
        const r = await api.get('/saas/module', { params: { page: 1, limit: 1000 } });
        const payload = r?.data ?? r?.items ?? r;
        const mods = Array.isArray(payload)
          ? payload
          : payload.modules || payload.items || [];
        setModules(mods);
      } catch (e) {
        console.error('Failed to load modules', e);
      }
    })();

    if (!isNew) {
      api.get(`/saas/plan/${id}`).then((res) => {
        const payload = res.data?.data || res.data;
        const p = payload || {};
        setPlanPayload(p);
        form.setValues({
          code: p.code || '',
          name: p.name || '',
          description: p.description || '',
          billingCycle: p.billingCycle || 'MONTHLY',
          durationDays: p.durationDays || p.duration || '',
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

  // when modules are loaded, initialize modulePermissions for create or merge for edit
  useEffect(() => {
    if (!modules || !modules.length) return;
    // build default permissions from modules (UI uses `enabled` internally)
    const defaultMods = modules.map((m) => ({
      moduleKey: m.moduleKey,
      displayName: m.displayName || m.moduleKey,
      visible: true,
      actions: (m.actions || []).map((a) => ({ key: a.key, displayName: a.displayName || a.key, enabled: true })),
    }));

    if (isNew) {
      // For new plans, enable all permissions by default
      form.setFieldValue('modulePermissions', defaultMods);
      return;
    }

    // merge with existing plan payload if available
    if (planPayload) {
      const planMods = planPayload.modulePermissions || [];
      const merged = modules.map((m) => {
        const existing = planMods.find((pm) => pm.moduleKey === m.moduleKey);
        const actions = (m.actions || []).map((a) => {
          const ex = existing && (existing.actions || []).find((x) => x.key === a.key);
          // preserve existing enabled OR visible flag; for newly added actions default to false
          const enabled = typeof (ex && ex.enabled) !== 'undefined' ? !!ex.enabled : (typeof (ex && ex.visible) !== 'undefined' ? !!ex.visible : false);
          return { key: a.key, displayName: a.displayName || a.key, enabled };
        });
        const modVisible = typeof existing?.visible !== 'undefined' ? !!existing.visible : actions.some((aa) => aa.enabled);
        return { moduleKey: m.moduleKey, displayName: m.displayName || m.moduleKey, visible: modVisible, actions };
      });
      form.setFieldValue('modulePermissions', merged);
    }
  }, [modules, planPayload]);

  // debounce moduleSearch and use backend search to determine which modules to show
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = (moduleSearch || '').trim();
      if (!q) {
        setFilteredModuleKeys(null);
        return;
      }
      try {
        const res = await api.get('/saas/module', { params: { q, page: 1, limit: 1000 } });
        const payload = res?.data ?? res?.items ?? res;
        const mods = Array.isArray(payload) ? payload : payload.modules || payload.items || [];
        setFilteredModuleKeys(mods.map((m) => m.moduleKey));
      } catch (err) {
        console.error('Module search failed', err);
        setFilteredModuleKeys(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [moduleSearch]);

  if (loading) return <CircularProgress />;

  if (!isNew && !hasPermission('saas.plan_update')) return <Alert severity="error">You don't have permission to edit plans</Alert>;
  if (isNew && !hasPermission('saas.plan_create')) return <Alert severity="error">You don't have permission to create plans</Alert>;

  return (
    <Box p={2}>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={form.handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <RequiredTextField name="code" label="Code" required formik={form} disabled={!isNew} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RequiredTextField name="name" label="Name" required formik={form} />
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
              <RequiredTextField name="price" label="Price (₹)" type="number" formik={form} />
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
            {/* Module permissions editor */}
            <Grid item xs={12}>
              <Typography variant="h6">Module Permissions</Typography>
              <TextField fullWidth placeholder="Search modules..." value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)} sx={{ mt: 1, mb: 1 }} />
              {(!form.values.modulePermissions || form.values.modulePermissions.length === 0) ? (
                <Typography variant="body2" color="text.secondary">No modules available</Typography>
              ) : (
                // If backend search is active use its results, otherwise show all modulePermissions
                (filteredModuleKeys && filteredModuleKeys.length
                  ? form.values.modulePermissions.filter((m) => filteredModuleKeys.includes(m.moduleKey))
                  : form.values.modulePermissions)
                  .map((m, idx) => {
                    const actions = m.actions || [];
                    const totalCount = actions.length;
                    const enabledCount = actions.filter((a) => !!a.enabled).length;
                    const isAllSelected = totalCount > 0 && enabledCount === totalCount;
                    const handleToggleAll = (e) => {
                      const setTo = e.target.checked;
                      const updated = JSON.parse(JSON.stringify(form.values.modulePermissions || []));
                      if (updated[idx] && Array.isArray(updated[idx].actions)) {
                        updated[idx].actions = updated[idx].actions.map((a) => ({ ...a, enabled: setTo }));
                        form.setFieldValue('modulePermissions', updated);
                      }
                    };

                    return (
                      <Accordion key={m.moduleKey} sx={{ mt: 1 }}>
                        <AccordionSummary expandIcon={<span>▾</span>}>
                          <FormControlLabel
                            control={<Checkbox checked={isAllSelected} indeterminate={!isAllSelected && enabledCount > 0} onChange={handleToggleAll} />}
                            label={<Typography sx={{ fontWeight: 600 }}>{m.displayName}</Typography>}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ pl: 1 }}>
                            {(m.actions || []).map((a, i) => (
                            <FormControlLabel
                              key={a.key}
                              control={<Checkbox checked={!!a.enabled} onChange={(e) => {
                                const updated = JSON.parse(JSON.stringify(form.values.modulePermissions || []));
                                updated[idx].actions[i].enabled = e.target.checked;
                                form.setFieldValue('modulePermissions', updated);
                              }} />}
                              label={a.displayName || a.key}
                            />
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })
              )}
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
