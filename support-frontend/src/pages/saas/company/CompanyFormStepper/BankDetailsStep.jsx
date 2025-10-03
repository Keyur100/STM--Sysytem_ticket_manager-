import { Grid, TextField } from "@mui/material";

export default function BankDetailsStep({ form, handleChange }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <TextField fullWidth label="Account No"
          value={form.bankAccount.accountNumber}
          onChange={(e) => handleChange("bankAccount.accountNumber", e.target.value)} />
      </Grid>
      <Grid item xs={4}>
        <TextField fullWidth label="IFSC Code"
          value={form.bankAccount.ifsc}
          onChange={(e) => handleChange("bankAccount.ifsc", e.target.value)} />
      </Grid>
      <Grid item xs={4}>
        <TextField fullWidth label="Bank Name"
          value={form.bankAccount.bankName}
          onChange={(e) => handleChange("bankAccount.bankName", e.target.value)} />
      </Grid>
    </Grid>
  );
}
