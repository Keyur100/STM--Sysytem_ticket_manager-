import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Grid,
  Chip,
  FormHelperText,
  useTheme,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";

export default function AddonForm() {
  const { id } = useParams();
  const editMode = !!id;
  const nav = useNavigate();
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modules, setModules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    name: "",
    value: "",
    description: "",
    type: "limit",
    scope: "global",
    companyId: "",
    billingType: "onetime",
    expiryType: "duration",
    durationDays: 30,
    price: "",
    hasTax: false,
    taxIncluded: true,
    taxName: "GST",
    // For type='limit': { limits: { key: value } }
    // For type='feature': { permissions: ["module.action"] }
    limitsData: {},
    permissionsData: [],
    isActive: true,
  });

  // Fetch modules for feature type addon creation
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await api.get("/saas/module", { params: { page: 1, limit: 100 } });
        setModules(Array.isArray(res?.data?.modules) ? res.data.modules : Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch modules:", err);
      }
    };
    fetchModules();
  }, []);

  // Fetch companies for company-specific addon creation
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get("/saas/company/names/list");
        setCompanies(Array.isArray(res?.data?.companies) ? res.data.companies : Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (editMode) fetchAddon();
  }, [id]);

  const fetchAddon = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/saas/addons/${id}`);
      const addon = res.data || res;
      const a = addon;
      
      // Parse provides based on type
      let limitsData = {};
      let permissionsData = [];
      if (a.type === "limit" && a.provides?.limits) {
        limitsData = a.provides.limits;
      } else if (a.type === "feature" && a.provides?.permissions) {
        permissionsData = a.provides.permissions || [];
      }

      setForm({
        name: a.name || "",
        value: a.value || "",
        description: a.description || "",
        type: a.type || "limit",
        scope: a.scope || "global",
        companyId: a.companyId || "",
        billingType: a.billingType || "onetime",
        expiryType: a.expiryType || "duration",
        durationDays: a.durationDays || 30,
        price: a.pricePaise ? (a.pricePaise / 100).toString() : "",
        hasTax: a.hasTax || false,
        taxIncluded: a.taxIncluded !== false,
        taxName: a.taxName || "GST",
        limitsData,
        permissionsData,
        isActive: a.isActive !== false,
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load add-on");
    } finally {
      setLoading(false);
    }
  };

  // Toggle permission selection
  const togglePermission = (permissionKey) => {
    setForm(prev => ({
      ...prev,
      permissionsData: prev.permissionsData.includes(permissionKey)
        ? prev.permissionsData.filter(p => p !== permissionKey)
        : [...prev.permissionsData, permissionKey]
    }));
  };

  // Add limit field
  const addLimitField = () => {
    setForm(prev => ({
      ...prev,
      limitsData: { ...prev.limitsData, "": "" }
    }));
  };

  // Update limit field
  const updateLimitField = (oldKey, newKey, value) => {
    const updated = { ...form.limitsData };
    if (oldKey !== newKey) delete updated[oldKey];
    updated[newKey] = isNaN(value) ? value : parseInt(value, 10);
    setForm(prev => ({ ...prev, limitsData: updated }));
  };

  // Remove limit field
  const removeLimitField = (key) => {
    const updated = { ...form.limitsData };
    delete updated[key];
    setForm(prev => ({ ...prev, limitsData: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Build provides object
    let provides = {};
    if (form.type === "limit") {
      provides = { limits: form.limitsData };
    } else if (form.type === "feature") {
      provides = { permissions: form.permissionsData };
    }

    const payload = {
      name: form.name,
      value: form.value,
      description: form.description,
      type: form.type,
      scope: form.scope,
      billingType: form.billingType,
      expiryType: form.expiryType,
      durationDays: form.durationDays || 30,
      provides,
      pricePaise: form.price ? Math.round(parseFloat(form.price) * 100) : 0,
      hasTax: form.hasTax,
      taxIncluded: form.taxIncluded,
      taxName: form.taxName,
      isActive: !!form.isActive,
    };

    // Add companyId only if scope is company
    if (form.scope === "company") {
      payload.companyId = form.companyId;
    }

    try {
      setLoading(true);
      if (editMode) {
        await api.put(`/saas/addons/${id}`, payload);
        setSuccess("Add-on updated successfully");
      } else {
        await api.post(`/saas/addons`, payload);
        setSuccess("Add-on created successfully");
      }
      setTimeout(() => nav('/addons'), 700);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to save add-on");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={3}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          {editMode ? '✏️ Edit Add-on' : '➕ Create Add-on'}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Configure your add-on with type, billing, and features
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>📋 Basic Info</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Value (unique key)"
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  required
                  helperText="e.g. extra_users, advanced_reporting"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Type & Scope Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>🎯 Type & Scope</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Add-on Type"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value, limitsData: {}, permissionsData: [] })}
                >
                  <MenuItem value="limit">📊 Limit (numeric values)</MenuItem>
                  <MenuItem value="feature">🔓 Feature (permissions/actions)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Scope"
                  value={form.scope}
                  onChange={e => setForm({ ...form, scope: e.target.value, companyId: "" })}
                >
                  <MenuItem value="global">🌍 Global (available to all)</MenuItem>
                  <MenuItem value="company">🏢 Company-specific</MenuItem>
                </TextField>
              </Grid>

              {/* Company Dropdown - Only show when scope is "company" */}
              {form.scope === "company" && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Select Company"
                    value={form.companyId}
                    onChange={e => setForm({ ...form, companyId: e.target.value })}
                    required
                    helperText="Company-specific addons must be assigned to a company"
                  >
                    <MenuItem value="">-- Choose a Company --</MenuItem>
                    {companies.map(company => (
                      <MenuItem key={company._id} value={company._id}>
                        {company.name} ({company.businessName || company.legalName})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Type-Specific Configuration */}
          {form.type === "limit" ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>📦 Limits</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Define numeric limits (e.g., max_employees: 10, storage_mb: 1024)
              </Typography>
              
              <Box sx={{ 
                p: 2, 
                backgroundColor: theme.palette.mode === "dark" ? "action.hover" : "#f5f5f5",
                borderRadius: 2,
                mb: 2
              }}>
                {Object.entries(form.limitsData).map(([key, value], idx) => (
                  <Grid container spacing={1} key={idx} sx={{ mb: 1.5 }}>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Limit name (e.g., max_employees)"
                        value={key}
                        onChange={e => updateLimitField(key, e.target.value, value)}
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="Value"
                        value={value}
                        onChange={e => updateLimitField(key, key, e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeLimitField(key)}
                        sx={{ width: "100%" }}
                      >
                        Remove
                      </Button>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  size="small"
                  onClick={addLimitField}
                  sx={{ mt: 1 }}
                  variant="outlined"
                >
                  ➕ Add Limit
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>🔐 Permissions/Actions</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Select module actions this add-on provides
              </Typography>
              
              {modules.length === 0 ? (
                <Alert severity="info">No modules available</Alert>
              ) : (
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: theme.palette.mode === "dark" ? "action.hover" : "#f5f5f5",
                  borderRadius: 2
                }}>
                  {modules.map(module => (
                    <Box key={module._id} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "primary.main" }}>
                        {module.displayName || module.moduleKey}
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {module.actions && module.actions.map(action => (
                          <FormControlLabel
                            key={action.key}
                            control={
                              <Checkbox
                                checked={form.permissionsData.includes(action.key)}
                                onChange={() => togglePermission(action.key)}
                              />
                            }
                            label={action.label || action.key}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
              
              {form.permissionsData.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Selected ({form.permissionsData.length}):</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                    {form.permissionsData.map(perm => (
                      <Chip key={perm} label={perm} onDelete={() => togglePermission(perm)} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Billing Configuration */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>💰 Billing & Expiry</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price (₹)"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Billing Type"
                  value={form.billingType}
                  onChange={e => setForm({ ...form, billingType: e.target.value })}
                >
                  <MenuItem value="onetime">🔔 One-time Purchase</MenuItem>
                  <MenuItem value="recurring">🔄 Recurring (Monthly)</MenuItem>
                </TextField>
              </Grid>

              {form.billingType === "recurring" && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Expiry Type"
                    value={form.expiryType}
                    onChange={e => setForm({ ...form, expiryType: e.target.value })}
                  >
                    <MenuItem value="duration">📅 Duration (days)</MenuItem>
                    <MenuItem value="plan_end">📌 Plan End Date</MenuItem>
                    <MenuItem value="yearly">📆 Yearly (1 year)</MenuItem>
                  </TextField>
                </Grid>
              )}

              {form.billingType === "recurring" && form.expiryType === "duration" && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Duration (days)"
                    value={form.durationDays}
                    onChange={e => setForm({ ...form, durationDays: parseInt(e.target.value) || 30 })}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.hasTax}
                      onChange={e => setForm({ ...form, hasTax: e.target.checked })}
                    />
                  }
                  label="Has Tax"
                />
              </Grid>

              {form.hasTax && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Tax Name"
                      value={form.taxName}
                      onChange={e => setForm({ ...form, taxName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.taxIncluded}
                          onChange={e => setForm({ ...form, taxIncluded: e.target.checked })}
                        />
                      }
                      label="Tax Included in Price"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Status */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                />
              }
              label="Is Active"
            />
          </Box>

          {/* Submit Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" type="submit" disabled={loading}>
              {loading ? "Saving..." : editMode ? "Update Add-on" : "Create Add-on"}
            </Button>
            <Button variant="outlined" onClick={() => nav('/addons')}>
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
