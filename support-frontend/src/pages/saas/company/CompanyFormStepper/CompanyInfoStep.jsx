import { Grid, TextField } from "@mui/material";

export default function CompanyInfoStep({ form, handleChange }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField fullWidth label="Company Name" value={form.name}
          onChange={(e) => handleChange("name", e.target.value)} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Company URL" value={form.url}
          onChange={(e) => handleChange("url", e.target.value)} />
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth label="PAN No" value={form.panNo}
          onChange={(e) => handleChange("panNo", e.target.value)} />
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth label="GST No" value={form.gstNo}
          onChange={(e) => handleChange("gstNo", e.target.value)} />
      </Grid>
    </Grid>
  );
}
