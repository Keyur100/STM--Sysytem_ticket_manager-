import React, { useEffect } from "react";
import { Box, Grid, TextField, Typography } from "@mui/material";

export default function BranchStep({ form, handleChange }) {
  useEffect(() => {
    // Prefill branch fields from company when available and branch fields are empty
    if (form.name) {
      if (!form.branchName) handleChange("branchName", form.name);
      if (!form.branchCompanyName) handleChange("branchCompanyName", form.name);
    }
    if (form.contact) {
      if (!form.branchAddress && form.contact.address) handleChange("branchAddress", form.contact.address);
      if (!form.branchPhone && form.contact.phone) handleChange("branchPhone", form.contact.phone);
      if (!form.branchEmail && form.contact.email) handleChange("branchEmail", form.contact.email);
    }
    if (form.gstNo && !form.branchGstn) handleChange("branchGstn", form.gstNo);
    if (form.panNo && !form.branchPan) handleChange("branchPan", form.panNo);
  }, [form.name, form.contact, form.gstNo, form.panNo]);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Branch Details</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Code" value={form.branchCode || ''} onChange={(e) => handleChange('branchCode', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Company Name" value={form.branchCompanyName || ''} onChange={(e) => handleChange('branchCompanyName', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Branch Name" value={form.branchName || ''} onChange={(e) => handleChange('branchName', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Tagline" value={form.branchTagline || ''} onChange={(e) => handleChange('branchTagline', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Address" value={form.branchAddress || ''} onChange={(e) => handleChange('branchAddress', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone" value={form.branchPhone || ''} onChange={(e) => handleChange('branchPhone', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone 2" value={form.branchPhone2 || ''} onChange={(e) => handleChange('branchPhone2', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email" value={form.branchEmail || ''} onChange={(e) => handleChange('branchEmail', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="GSTN" value={form.branchGstn || ''} onChange={(e) => handleChange('branchGstn', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="PAN" value={form.branchPan || ''} onChange={(e) => handleChange('branchPan', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Logo (filename/url)" value={form.branchLogo || ''} onChange={(e) => handleChange('branchLogo', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Contact Info (JSON)" value={form.branchContactInfo || ''} onChange={(e) => handleChange('branchContactInfo', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Contact Person Name" value={form.contact?.personName || ''} onChange={(e) => handleChange('contact.personName', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Contact Person Email" value={form.contact?.email || ''} onChange={(e) => handleChange('contact.email', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Contact Person Phone" value={form.contact?.phone || ''} onChange={(e) => handleChange('contact.phone', e.target.value)} />
        </Grid>
      </Grid>
    </Box>
  );
}
