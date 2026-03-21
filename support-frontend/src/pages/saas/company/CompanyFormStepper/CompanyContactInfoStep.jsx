import { Grid, Button, Stack } from "@mui/material";
import RequiredTextField from '../../../../components/form/RequiredTextField';

export default function CompanyContactInfoStep({ form, handleChange, onEditBranches, onEditClientUsers }) {
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
    <Grid container spacing={2}>
        <Grid item xs={12}>
          <RequiredTextField formik={null} name="code" fullWidth label="Code" value={form.code || ''} onChange={(e) => handleChange('code', e.target.value)} helperText={fieldError('code').msg} error={fieldError('code').show} />
        </Grid>

        
      {/* Company Details */}
            <Grid item xs={12}>
              <RequiredTextField formik={null} name="name" required fullWidth label="Company Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} helperText={fieldError('name').msg} error={fieldError('name').show} />
            </Grid>
            <Grid item xs={12}>
              <RequiredTextField formik={null} name="contact.email" required fullWidth label="Email" type="email" value={form.contact.email} onChange={(e) => handleChange("contact.email", e.target.value)} helperText={fieldError('contact.email').msg} error={fieldError('contact.email').show} />
            </Grid>
      <Grid item xs={12}>
        <RequiredTextField formik={null} name="url" fullWidth label="Company URL" value={form.url} onChange={(e) => handleChange("url", e.target.value)} />
      </Grid>
      <Grid item xs={6}>
        <RequiredTextField formik={null} name="panNo" fullWidth label="PAN No" value={form.panNo} onChange={(e) => handleChange("panNo", e.target.value)} />
      </Grid>
      <Grid item xs={6}>
        <RequiredTextField formik={null} name="gstNo" fullWidth label="GST No" value={form.gstNo} onChange={(e) => handleChange("gstNo", e.target.value)} />
      </Grid>

      {/* Contact Details */}
      <Grid item xs={6}>
        <RequiredTextField formik={null} name="contact.personName" fullWidth label="Contact Person" value={form.contact.personName} onChange={(e) => handleChange("contact.personName", e.target.value)} />
      </Grid>
      {/* <Grid item xs={6}>
        <TextField
          fullWidth
          label="Email"
          value={form.contact.email}
          onChange={(e) => handleChange("contact.email", e.target.value)}
        />
      </Grid> */}
      <Grid item xs={6}>
        <RequiredTextField formik={null} name="contact.phone" fullWidth label="Phone" value={form.contact.phone} onChange={(e) => handleChange("contact.phone", e.target.value)} />
      </Grid>
      <Grid item xs={12}>
        <RequiredTextField formik={null} name="contact.address" fullWidth label="Address" value={form.contact.address} onChange={(e) => handleChange("contact.address", e.target.value)} />
      </Grid>
    </Grid>
  );
}
