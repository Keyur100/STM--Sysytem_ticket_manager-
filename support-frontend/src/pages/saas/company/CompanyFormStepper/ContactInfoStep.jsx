import { Grid, TextField } from "@mui/material";

export default function ContactInfoStep({ form, handleChange }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <TextField fullWidth label="Contact Person" value={form.contact.personName}
          onChange={(e) => handleChange("contact.personName", e.target.value)} />
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth label="Email" value={form.contact.email}
          onChange={(e) => handleChange("contact.email", e.target.value)} />
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth label="Phone" value={form.contact.phone}
          onChange={(e) => handleChange("contact.phone", e.target.value)} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Address" value={form.contact.address}
          onChange={(e) => handleChange("contact.address", e.target.value)} />
      </Grid>
    </Grid>
  );
}
