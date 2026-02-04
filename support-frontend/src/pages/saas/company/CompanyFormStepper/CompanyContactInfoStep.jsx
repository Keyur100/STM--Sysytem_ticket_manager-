import { Grid, TextField } from "@mui/material";

export default function CompanyContactInfoStep({ form, handleChange }) {
  return (
    <Grid container spacing={2}>
      {/* Company Details */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Company Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Company URL"
          value={form.url}
          onChange={(e) => handleChange("url", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="PAN No"
          value={form.panNo}
          onChange={(e) => handleChange("panNo", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="GST No"
          value={form.gstNo}
          onChange={(e) => handleChange("gstNo", e.target.value)}
        />
      </Grid>

      {/* Contact Details */}
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="Contact Person"
          value={form.contact.personName}
          onChange={(e) => handleChange("contact.personName", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="Email"
          value={form.contact.email}
          onChange={(e) => handleChange("contact.email", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="Phone"
          value={form.contact.phone}
          onChange={(e) => handleChange("contact.phone", e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Address"
          value={form.contact.address}
          onChange={(e) => handleChange("contact.address", e.target.value)}
        />
      </Grid>
    </Grid>
  );
}
