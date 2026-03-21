import React, { useEffect, useState } from "react";
import { Box, Paper, TextField, Button, MenuItem, Alert, CircularProgress, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";

export default function AddonForm() {
  const { id } = useParams();
  const editMode = !!id;
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    name: "",
    value: "",
    description: "",
    type: "limit",
    price: "",
    providesText: "{}",
    durationDays: null,
    isActive: true,
  });

  useEffect(() => {
    if (editMode) fetchAddon();
  }, [id]);

  const fetchAddon = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/saas/addons/${id}`);
      const data = res.data?.data || res.data || res;
      const a = data.addon || data;
      setForm({
        name: a.name || "",
        value: a.value || "",
        description: a.description || "",
        type: a.type || "limit",
        price: a.pricePaise ? (a.pricePaise / 100).toString() : "",
        providesText: a.provides ? JSON.stringify(a.provides, null, 2) : "{}",
        durationDays: a.durationDays || null,
        isActive: a.isActive !== false,
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load add-on");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // validate provides JSON
    let provides = {};
    try {
      provides = JSON.parse(form.providesText || "{}");
    } catch (err) {
      setError("Invalid JSON in Provides field");
      return;
    }

    const payload = {
      name: form.name,
      value: form.value,
      description: form.description,
      type: form.type,
      provides,
      durationDays: form.durationDays || null,
      pricePaise: form.price ? Math.round(parseFloat(form.price) * 100) : 0,
      isActive: !!form.isActive,
    };

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
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{editMode ? 'Edit Add-on' : 'Create Add-on'}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={{ mb: 2 }} required />
          <TextField fullWidth label="Value (unique key)" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} sx={{ mb: 2 }} required />
          <TextField fullWidth label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} sx={{ mb: 2 }} multiline rows={3} />

          <TextField select fullWidth label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} sx={{ mb: 2 }}>
            <MenuItem value="limit">Limit (numeric provides)</MenuItem>
            <MenuItem value="feature">Feature (module/permission payload)</MenuItem>
          </TextField>

          <TextField fullWidth label="Price (₹)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} sx={{ mb: 2 }} type="number" inputProps={{ step: '0.01' }} />

          <TextField fullWidth label="Provides (JSON)" value={form.providesText} onChange={e => setForm({ ...form, providesText: e.target.value })} sx={{ mb: 2 }} multiline rows={6} helperText={form.type === 'limit' ? 'Example: {"max_employees": 10}' : 'Example (feature): [{"moduleKey":"invoices","actions":["create","read"]}] or an object'} />

          <TextField fullWidth label="Duration (days)" value={form.durationDays || ''} onChange={e => setForm({ ...form, durationDays: e.target.value ? parseInt(e.target.value, 10) : null })} sx={{ mb: 2 }} type="number" />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" type="submit">Save</Button>
            <Button variant="outlined" onClick={() => nav('/addons')}>Cancel</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
