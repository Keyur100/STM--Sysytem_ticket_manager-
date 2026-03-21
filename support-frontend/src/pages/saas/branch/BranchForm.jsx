import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Paper, TextField, Button, Typography } from "@mui/material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../../api/axios";
import endpoints from "../../../api/saas/endpoints";

export default function BranchForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const companyId = params.get("companyId");

  const [form, setForm] = useState({ code: '', companyName: '', name: '', tagline: '', address: '', logo: '', phone: '', phone2: '', email: '', gstn: '', pan: '', status: 'active', contactInfo: '', contactPerson: { name: '', email: '', phone: '' } });

  const companyDetails = useSelector((s) => s.company.selected);

  useEffect(() => {
    if (id) (async () => {
      try {
        const res = await api.get(endpoints.branch.get(id));
        const branch = (res && res.data) ? res.data : res;
        if (branch) setForm(branch);
      } catch (err) { console.error(err); }
    })();
    else if (companyId) {
      // Prefill branch fields from company if available in store or fetch company
      (async () => {
        try {
          let data = null;
          if (companyDetails && companyDetails._id === companyId) data = companyDetails;
          else {
            const r = await api.get(`/saas/company/${companyId}`);
            data = r.data || null;
          }

          if (data) {
            setForm((f) => ({
              ...f,
              companyName: data.name || data.company?.name || f.companyName,
              name: data.name || f.name,
              address: data.contact?.address || f.address,
              phone: data.contact?.phone || f.phone,
              email: data.contact?.email || f.email,
              gstn: data.gstNo || data.gst || f.gstn,
              pan: data.panNo || f.pan,
              contactPerson: {
                name: data.contact?.personName || f.contactPerson.name,
                email: data.contact?.email || f.contactPerson.email,
                phone: data.contact?.phone || f.contactPerson.phone,
              }
            }));
          }
        } catch (err) { console.error(err); }
      })();
    }
  }, [id, companyId, companyDetails]);

  const handleSave = async () => {
    try {
      if (id) await api.put(endpoints.branch.update(id), form);
      else await api.post(endpoints.branch.create, { ...form, companyId });
      navigate(-1);
    } catch (err) { console.error(err); }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{id ? 'Edit Branch' : 'Add Branch'}</Typography>
        <Box sx={{ mt: 2 }}>
          <TextField fullWidth label="Code" value={form.code || ''} onChange={(e) => setForm(f=>({...f, code: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Company Name" value={form.companyName || ''} onChange={(e) => setForm(f=>({...f, companyName: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Name" value={form.name || ''} onChange={(e) => setForm(f=>({...f, name: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Tagline" value={form.tagline || ''} onChange={(e) => setForm(f=>({...f, tagline: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Address" value={form.address || ''} onChange={(e) => setForm(f=>({...f, address: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Phone" value={form.phone || ''} onChange={(e) => setForm(f=>({...f, phone: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Phone 2" value={form.phone2 || ''} onChange={(e) => setForm(f=>({...f, phone2: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Email" value={form.email || ''} onChange={(e) => setForm(f=>({...f, email: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="GSTN" value={form.gstn || ''} onChange={(e) => setForm(f=>({...f, gstn: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="PAN" value={form.pan || ''} onChange={(e) => setForm(f=>({...f, pan: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Logo (filename/url)" value={form.logo || ''} onChange={(e) => setForm(f=>({...f, logo: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Contact Info (JSON)" value={form.contactInfo || ''} onChange={(e) => setForm(f=>({...f, contactInfo: e.target.value}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Contact Person Name" value={form.contactPerson?.name || ''} onChange={(e) => setForm(f=>({...f, contactPerson: {...f.contactPerson, name: e.target.value}}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Contact Person Email" value={form.contactPerson?.email || ''} onChange={(e) => setForm(f=>({...f, contactPerson: {...f.contactPerson, email: e.target.value}}))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Contact Person Phone" value={form.contactPerson?.phone || ''} onChange={(e) => setForm(f=>({...f, contactPerson: {...f.contactPerson, phone: e.target.value}}))} sx={{ mb: 2 }} />
          <Box display="flex" gap={2}>
            <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>{id ? 'Update' : 'Create'}</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
