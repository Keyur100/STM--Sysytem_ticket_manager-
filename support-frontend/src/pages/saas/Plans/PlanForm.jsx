import React, { useEffect, useState, useMemo, useCallback } from 'react';
import * as RW from 'react-window';
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
  durationDays: yup.number()
    .transform((value, originalValue) => originalValue === '' ? null : value)
    .nullable()
    .min(0, 'Duration must be non-negative'),
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
  const FixedSizeList = RW?.FixedSizeList || RW?.default?.FixedSizeList || null;

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
        // preserve module permission metadata for API submit
        const modulePermissionsForApi = (values.modulePermissions || []).map((m) => {
          const actions = (m.actions || []).map((a) => ({ ...a, enabled: !!a.enabled }));
          return {
            ...m,
            visible: typeof m.visible !== 'undefined' ? !!m.visible : actions.some((a) => !!a.enabled),
            actions,
          };
        });

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
  }, [id, isNew]);

  // when modules are loaded, initialize modulePermissions for create or merge for edit
  const filteredModules = useMemo(() => {
    const modulePermissions = form.values.modulePermissions || [];
    if (filteredModuleKeys && filteredModuleKeys.length) {
      return modulePermissions.filter((m) => filteredModuleKeys.includes(m.moduleKey));
    }
    return modulePermissions;
  }, [form.values.modulePermissions, filteredModuleKeys]);

  const toggleModuleAction = useCallback(
    (moduleKey, actionKey) => {
      const current = form.values.modulePermissions || [];
      const next = current.map((mod) => {
        if (mod.moduleKey !== moduleKey) return mod;
        const actions = (mod.actions || []).map((a) =>
          a.key === actionKey ? { ...a, enabled: !a.enabled } : a
        );
        return { ...mod, actions };
      });
      form.setFieldValue('modulePermissions', next);
    },
    [form]
  );

  const toggleAllModuleActions = useCallback(
    (moduleKey) => {
      const current = form.values.modulePermissions || [];
      const next = current.map((mod) => {
        if (mod.moduleKey !== moduleKey) return mod;
        const allEnabled = (mod.actions || []).every((a) => !!a.enabled);
        return { ...mod, actions: (mod.actions || []).map((a) => ({ ...a, enabled: !allEnabled })) };
      });
      form.setFieldValue('modulePermissions', next);
    },
    [form]
  );

  useEffect(() => {
    if (!modules || !modules.length) return;
    // build default permissions from modules (UI uses `enabled` internally)
    const defaultMods = modules.map((m) => ({
      moduleKey: m.moduleKey,
      displayName: m.displayName || m.moduleKey,
      visible: true,
      actions: (m.actions || []).map((a) => ({ key: a.key, label: a.label, displayName: a.displayName || a.label || a.key, enabled: true })),
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
          return { ...a, displayName: a.displayName || a.label || a.key, enabled };
        });
        const modVisible = typeof existing?.visible !== 'undefined' ? !!existing.visible : actions.some((aa) => aa.enabled);
        return { ...m, displayName: m.displayName || m.moduleKey, visible: modVisible, actions };
      });
      form.setFieldValue('modulePermissions', merged);
    }
  }, [modules, planPayload, isNew]);

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
              <RequiredTextField name="durationDays" label="Duration (Days)" type="number" formik={form} />
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
              {(!filteredModules || filteredModules.length === 0) ? (
                <Typography variant="body2" color="text.secondary">No modules available</Typography>
              ) : FixedSizeList ? (
                <FixedSizeList
                  height={Math.min(600, filteredModules.length * 120)}
                  itemCount={filteredModules.length}
                  itemSize={120}
                  width="100%"
                  itemData={filteredModules}
                >
                  {({ index, style, data }) => {
                    const m = data[index];
                    return (
                      <div style={style} key={m.moduleKey}>
                        <ModulePermissionCard
                          mod={m}
                          togglePermission={toggleModuleAction}
                          toggleAll={toggleAllModuleActions}
                        />
                      </div>
                    );
                  }}
                </FixedSizeList>
              ) : (
                filteredModules.map((m) => (
                  <ModulePermissionCard
                    key={m.moduleKey}
                    mod={m}
                    togglePermission={toggleModuleAction}
                    toggleAll={toggleAllModuleActions}
                  />
                ))
              )}
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

const ModulePermissionCard = React.memo(({ mod, togglePermission, toggleAll }) => {
  const actionsState = mod.actions || [];
  const totalCount = actionsState.length;
  const enabledCount = actionsState.filter((a) => !!a.enabled).length;
  const isAllSelected = totalCount > 0 && enabledCount === totalCount;

  return (
    <Accordion sx={{ mt: 1 }}>
      <AccordionSummary expandIcon={<span>▾</span>}>
        <FormControlLabel
          control={
            <Checkbox
              checked={isAllSelected}
              indeterminate={!isAllSelected && enabledCount > 0}
              onChange={() => toggleAll(mod.moduleKey)}
            />
          }
          label={<Typography sx={{ fontWeight: 600 }}>{mod.displayName || mod.moduleKey}</Typography>}
          onClick={(e) => e.stopPropagation()}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ pl: 1 }}>
          {(mod.actions || []).map((action) => (
            <FormControlLabel
              key={action.key}
              control={
                <Checkbox
                  checked={!!action.enabled}
                  onChange={() => togglePermission(mod.moduleKey, action.key)}
                />
              }
              label={action.displayName || action.key}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
});