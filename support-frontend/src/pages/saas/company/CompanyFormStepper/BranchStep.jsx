import React, { useEffect } from "react";
import { Box, Grid, Typography } from "@mui/material";
import RequiredTextField from '../../../../components/form/RequiredTextField';

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
    // If editing existing branch, ensure branchCode is prefilled from form.branchCode
    if (form.branchCode && !form.branchCode) handleChange('branchCode', form.branchCode);
  }, [form.name, form.contact, form.gstNo, form.panNo]);

  const errors = form?.errors || {};
  const touched = form?.touched || {};

  const fieldError = (path) => {
    const parts = String(path).split('.');
    let e = errors;
    let t = touched;
    for (const p of parts) {
      e = e && e[p];
      t = t && t[p];
    }
    return { show: !!(t && e), msg: t && e ? e : "" };
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Branch Details</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchCode" label="Code" required onChange={(e) => handleChange('branchCode', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchCompanyName" label="Company Name" required onChange={(e) => handleChange('branchCompanyName', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchName" label="Branch Name" required onChange={(e) => handleChange('branchName', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchTagline" label="Tagline" onChange={(e) => handleChange('branchTagline', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <RequiredTextField formik={form} name="branchAddress" label="Address" required onChange={(e) => handleChange('branchAddress', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchPhone" label="Phone" onChange={(e) => handleChange('branchPhone', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchPhone2" label="Phone 2" onChange={(e) => handleChange('branchPhone2', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchEmail" label="Email" required onChange={(e) => handleChange('branchEmail', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchGstn" label="GSTN" onChange={(e) => handleChange('branchGstn', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchPan" label="PAN" onChange={(e) => handleChange('branchPan', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="branchLogo" label="Logo (filename/url)" onChange={(e) => handleChange('branchLogo', e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <RequiredTextField formik={form} name="branchContactInfo" label="Contact Info (JSON)" onChange={(e) => handleChange('branchContactInfo', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="contact.personName" label="Contact Person Name" onChange={(e) => handleChange('contact.personName', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="contact.email" label="Contact Person Email" onChange={(e) => handleChange('contact.email', e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RequiredTextField formik={form} name="contact.phone" label="Contact Person Phone" onChange={(e) => handleChange('contact.phone', e.target.value)} />
        </Grid>
      </Grid>
    </Box>
  );
}
