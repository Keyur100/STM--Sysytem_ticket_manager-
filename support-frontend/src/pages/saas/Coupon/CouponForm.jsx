import React, { useEffect } from "react";
import { Box, Paper, Button, TextField, FormControlLabel, Switch, MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../../api/axios";
import { useNavigate, useParams } from "react-router-dom";

const schema = yup.object({
  code: yup.string().required(),
  type: yup.string().required(),
  value: yup.number().required(),
  validFrom: yup.date().required(),
  validTo: yup.date().required(),
});

export default function CouponForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();

  const form = useFormik({
    initialValues: {
      code: "",
      type: "",
      value: 0,
      validFrom: "",
      validTo: "",
    },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (isNew) {
        await api.post("/coupons", v);
      } else {
        await api.patch(`/coupons/${id}`, v);
      }
      nav("/coupons");
    },
  });

  useEffect(() => {
    if (!isNew) {
      api.get(`/get-perticular/coupons/${id}`).then((r) => {
        form.setValues(r.data);
      });
    }
  }, [id]);

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={form.handleSubmit}>
          <TextField
            name="code"
            label="Coupon Code"
            fullWidth
            value={form.values.code}
            onChange={form.handleChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Coupon Type</InputLabel>
            <Select
              name="type"
              value={form.values.type}
              onChange={form.handleChange}
              label="Coupon Type"
            >
              <MenuItem value="PERCENT">Percent</MenuItem>
              <MenuItem value="FIXED">Fixed</MenuItem>
            </Select>
          </FormControl>
          <TextField
            name="value"
            label="Value"
            fullWidth
            value={form.values.value}
            onChange={form.handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            name="validFrom"
            label="Valid From"
            type="date"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            value={form.values.validFrom}
            onChange={form.handleChange}
            sx={{ mb: 2 }}
          />
          <TextField
            name="validTo"
            label="Valid To"
            type="date"
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            value={form.values.validTo}
            onChange={form.handleChange}
            sx={{ mb: 2 }}
          />
          <Box mt={2}>
            <Button variant="contained" type="submit">Save</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
