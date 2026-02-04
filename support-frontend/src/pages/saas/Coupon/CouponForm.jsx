import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  Divider,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import usePermissions from "../../../helpers/hooks/usePermissions";

const schema = yup.object({
  code: yup.string().required("Coupon code is required"),
  description: yup.string(),
  discountType: yup.string().required("Discount type is required").oneOf(["percentage", "fixed"]),
  discountValue: yup.number().required("Discount value is required").min(0),
  maxDiscountPaise: yup.number().min(0),
  minSpendPaise: yup.number().min(0),
  maxUses: yup.number().min(0),
  validFrom: yup.number(),
  validTo: yup.number(),
  isActive: yup.boolean(),
  appliesTo: yup.string().oneOf(["PLAN", "ADDON", "ALL"]),
  eligiblePlanCodes: yup.array(),
});

export default function CouponForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState(null);

  const form = useFormik({
    initialValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      maxDiscountPaise: null,
      minSpendPaise: 0,
      maxUses: null,
      validFrom: Date.now(),
      validTo: Date.now() + 30 * 24 * 60 * 60 * 1000,
      isActive: true,
      appliesTo: "PLAN",
      eligiblePlanCodes: [],
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      try {
        setError(null);
        if (isNew) {
          await api.post("/saas/coupon", values);
        } else {
          await api.put(`/saas/coupon/${id}`, values);
        }
        nav("/saas/coupon");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to save coupon");
      }
    },
  });

  useEffect(() => {
    if (!isNew) {
      api
        .get(`/saas/coupon/${id}`)
        .then((r) => {
          form.setValues(r.data);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load coupon");
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return <CircularProgress />;

  if (!hasPermission("saas.coupon_create") && isNew) {
    return <Alert severity="error">You don't have permission to create coupons</Alert>;
  }

  if (!hasPermission("saas.coupon_update") && !isNew) {
    return <Alert severity="error">You don't have permission to edit coupons</Alert>;
  }

  return (
    <Box p={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          {isNew ? "Create Coupon" : "Edit Coupon"}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={form.handleSubmit}>
          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid item xs={12} sm={6}>
              <TextField
                name="code"
                label="Coupon Code"
                fullWidth
                value={form.values.code}
                onChange={form.handleChange}
                error={!!form.errors.code}
                helperText={form.errors.code}
                disabled={!isNew}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    name="isActive"
                    checked={form.values.isActive}
                    onChange={form.handleChange}
                  />
                }
                label="Active"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={form.values.description}
                onChange={form.handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, my: 1 }}>
                Discount Settings
              </Typography>
            </Grid>

            {/* Discount Type & Value */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Discount Type</InputLabel>
                <Select
                  name="discountType"
                  value={form.values.discountType}
                  onChange={form.handleChange}
                  label="Discount Type"
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="discountValue"
                label={form.values.discountType === "percentage" ? "Discount %" : "Discount Amount (₹)"}
                type="number"
                fullWidth
                value={form.values.discountValue}
                onChange={form.handleChange}
                error={!!form.errors.discountValue}
                helperText={form.errors.discountValue}
              />
            </Grid>

            {form.values.discountType === "percentage" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  name="maxDiscountPaise"
                  label="Max Discount (₹)"
                  type="number"
                  fullWidth
                  value={form.values.maxDiscountPaise || ""}
                  onChange={form.handleChange}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, my: 1 }}>
                Usage & Validity
              </Typography>
            </Grid>

            {/* Validity */}
            <Grid item xs={12} sm={6}>
              <TextField
                name="minSpendPaise"
                label="Min Spend (₹)"
                type="number"
                fullWidth
                value={form.values.minSpendPaise}
                onChange={form.handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="maxUses"
                label="Max Uses (0 = unlimited)"
                type="number"
                fullWidth
                value={form.values.maxUses || ""}
                onChange={form.handleChange}
              />
            </Grid>

            {/* Dates */}
            <Grid item xs={12} sm={6}>
              <TextField
                name="validFrom"
                label="Valid From"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={new Date(form.values.validFrom).toISOString().slice(0, 16)}
                onChange={(e) => form.setFieldValue("validFrom", new Date(e.target.value).getTime())}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="validTo"
                label="Valid To"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={new Date(form.values.validTo).toISOString().slice(0, 16)}
                onChange={(e) => form.setFieldValue("validTo", new Date(e.target.value).getTime())}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, my: 1 }}>
                Applicability
              </Typography>
            </Grid>

            {/* Applies To */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Applies To</InputLabel>
                <Select
                  name="appliesTo"
                  value={form.values.appliesTo}
                  onChange={form.handleChange}
                  label="Applies To"
                >
                  <MenuItem value="PLAN">Plans Only</MenuItem>
                  <MenuItem value="ADDON">Add-ons Only</MenuItem>
                  <MenuItem value="ALL">All</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Eligible Plan Codes */}
            <Grid item xs={12}>
              <TextField
                name="eligiblePlanCodes"
                label="Eligible Plan Codes (comma-separated)"
                fullWidth
                value={(form.values.eligiblePlanCodes || []).join(", ")}
                onChange={(e) =>
                  form.setFieldValue(
                    "eligiblePlanCodes",
                    e.target.value.split(",").map((c) => c.trim()).filter(Boolean)
                  )
                }
                helperText="Leave empty for all plans"
              />
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                <Button variant="contained" type="submit">
                  {isNew ? "Create Coupon" : "Update Coupon"}
                </Button>
                <Button variant="outlined" onClick={() => nav("/saas/coupon")}>
                  Cancel
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
