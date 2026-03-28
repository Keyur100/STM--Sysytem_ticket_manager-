import React, { useEffect, useState } from "react";
import {
  Box, Paper, TextField, Button, Typography, Grid, Divider
} from "@mui/material";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../../api/axios";
import endpoints from "../../../api/saas/endpoints";

export default function BranchForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const companyId = params.get("companyId");

  const companyDetails = useSelector((s) => s.company.selected);

  const [form, setForm] = useState({
    code: '',
    companyName: '',
    name: '',
    tagline: '',
    address: '',
    logo: '',
    phone: '',
    phone2: '',
    email: '',
    gstn: '',
    pan: '',
    status: 'active',
    contactInfo: {},
    contactPerson: { name: '', email: '', phone: '' }
  });

  useEffect(() => {
    if (id) {
      (async () => {
        const res = await api.get(endpoints.branch.get(id));
        const wrapper = res?.data || {};
        const branch = wrapper.data || wrapper;
        if (branch) setForm(branch);
      })();
    } else if (companyId) {
      (async () => {
        let data = null;

        if (companyDetails && companyDetails._id === companyId) {
          data = companyDetails;
        } else {
          const r = await api.get(`/saas/company/${companyId}`);
          data = r.data;
        }

        if (data) {
          setForm((f) => ({
            ...f,
            companyName: data.name || '',
            address: data.contact?.address || '',
            phone: data.contact?.phone || '',
            email: data.contact?.email || '',
            gstn: data.gstNo || '',
            pan: data.panNo || '',
            contactInfo: {
              personName: data.contact?.personName || '',
              email: data.contact?.email || '',
              phone: data.contact?.phone || ''
            },
            contactPerson: {
              name: data.contact?.personName || '',
              email: data.contact?.email || '',
              phone: data.contact?.phone || ''
            }
          }));
        }
      })();
    }
  }, [id, companyId, companyDetails]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleContactChange = (field, value) => {
    setForm((f) => ({
      ...f,
      contactPerson: { ...f.contactPerson, [field]: value }
    }));
  };

  const handleSave = async () => {
    try {
      if (id) await api.put(endpoints.branch.update(id), form);
      else await api.post(endpoints.branch.create, { ...form, companyId });
      navigate(-1);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box p={3}>
      <Paper sx={{ p: 3, maxWidth: 900, margin: "auto" }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {id ? "Edit Branch" : "Create Branch"}
        </Typography>

        {/* Company Section */}
        {!id && (
          <>
            <Typography variant="subtitle1" fontWeight={600} mt={2}>
              Company Info
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={form.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Branch Section */}
        <Typography variant="subtitle1" fontWeight={600} mt={3}>
          Branch Details
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Code" value={form.code} onChange={(e) => handleChange("code", e.target.value)} />
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField fullWidth label="Branch Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Tagline" value={form.tagline} onChange={(e) => handleChange("tagline", e.target.value)} />
          </Grid>

          <Grid item xs={12}>
            <TextField fullWidth label="Address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Phone 2" value={form.phone2} onChange={(e) => handleChange("phone2", e.target.value)} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField fullWidth label="GSTN" value={form.gstn} onChange={(e) => handleChange("gstn", e.target.value)} />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField fullWidth label="PAN" value={form.pan} onChange={(e) => handleChange("pan", e.target.value)} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Logo URL" value={form.logo} onChange={(e) => handleChange("logo", e.target.value)} />
          </Grid>

          {/* <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Status"
              select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </TextField>
          </Grid> */}
        </Grid>

        {/* Contact Section */}
        <Typography variant="subtitle1" fontWeight={600} mt={3}>
          Contact Person
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Contact Person" value={form.contactInfo?.personName || form.contactPerson?.name || ''} onChange={(e) => setForm(f => ({ ...f, contactInfo: { ...f.contactInfo, personName: e.target.value } }))} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Contact Email" value={form.contactInfo?.email || form.contactPerson?.email || ''} onChange={(e) => setForm(f => ({ ...f, contactInfo: { ...f.contactInfo, email: e.target.value } }))} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Contact Phone" value={form.contactInfo?.phone || form.contactPerson?.phone || ''} onChange={(e) => setForm(f => ({ ...f, contactInfo: { ...f.contactInfo, phone: e.target.value } }))} />
          </Grid>
        </Grid>

        {/* Actions */}
        <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {id ? "Update" : "Create"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}