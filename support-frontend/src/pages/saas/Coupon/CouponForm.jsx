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
  Typography,
  Divider,
  Chip,
  OutlinedInput,
  Stack,
} from "@mui/material";
import RequiredTextField from '../../../components/form/RequiredTextField';
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import usePermissions from "../../../helpers/hooks/usePermissions";

/* ================= VALIDATION ================= */

const schema = yup.object({
  code: yup.string().required("Coupon code is required"),
  description: yup.string(),

  discountType: yup
    .string()
    .required("Discount type is required")
    .oneOf(["percentage", "fixed"]),

  discountValue: yup
    .number()
    .typeError("Must be a number")
    .required("Discount value is required")
    .min(0, "Must be >= 0"),

  maxDiscountPaise: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .typeError("Must be a number")
    .min(0, "Must be >= 0"),

  minSpendPaise: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Must be >= 0"),

  maxUses: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .typeError("Must be a number")
    .min(0, "Must be >= 0"),

  validFrom: yup.number(),
  validTo: yup.number(),

  isActive: yup.boolean(),

  appliesTo: yup.string().oneOf(["PLAN", "ADDON", "ALL"]),

  eligiblePlanCodes: yup.array(),
});

/* ================= COMPONENT ================= */

export default function CouponForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);

  const form = useFormik({
    initialValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      maxDiscountPaise: "",
      minSpendPaise: 0,
      maxUses: "",
      companyIds: [],
      validFrom: Date.now(),
      validTo: Date.now() + 30 * 24 * 60 * 60 * 1000,
      isActive: true,
      
      eligiblePlanCodes: [],
      isSystem: false,
    },
    validationSchema: schema,
    validateOnBlur: true,
    validateOnChange: true,

    onSubmit: async (values) => {
      try {
        setError(null);

          // Prepare payload: backend expects paise for amount fields.
          const payload = {
            ...values,
            // keep discountValue as rupees for backend to convert fixed->paise
            discountValue: Number(values.discountValue),
            maxDiscountPaise: values.maxDiscountPaise !== "" && values.maxDiscountPaise !== null && values.maxDiscountPaise !== undefined
              ? Math.round(Number(values.maxDiscountPaise) * 100)
              : null,
            minSpendPaise: values.minSpendPaise !== "" && values.minSpendPaise !== null && values.minSpendPaise !== undefined
              ? Math.round(Number(values.minSpendPaise) * 100)
              : 0,
            maxUses: values.maxUses ? Number(values.maxUses) : null,
            companyIds: values.companyIds && values.companyIds.length ? values.companyIds : [],
          };

        if (isNew) {
          await api.post("/saas/coupons", payload);
        } else {
          await api.put(`/saas/coupons/${id}`, payload);
        }

        nav("/coupons");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to save coupon");
      }
    },
  });

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!isNew) {
      api
        .get(`/saas/coupons/${id}`)
        .then((r) => {
            const data = r.data || {};
            // convert stored paise values to rupees for the UI
            const uiValues = { ...data };
            if (uiValues.discountType && uiValues.discountType !== 'percentage') {
              uiValues.discountValue = (uiValues.discountValue || 0) / 100;
            }
            if (uiValues.maxDiscountPaise !== undefined && uiValues.maxDiscountPaise !== null) {
              uiValues.maxDiscountPaise = uiValues.maxDiscountPaise / 100;
            }
            if (uiValues.minSpendPaise !== undefined && uiValues.minSpendPaise !== null) {
              uiValues.minSpendPaise = uiValues.minSpendPaise / 100;
            }
            // normalize company ids for the multi-select UI
            uiValues.companyIds = data.companyIds && data.companyIds.length ? data.companyIds : (data.companyId ? [data.companyId] : []);
            // ensure fields expected by the form exist
            form.setValues({ ...form.initialValues, ...uiValues });
            setLoading(false);
        })
        .catch(() => {
          setError("Failed to load coupon");
          setLoading(false);
        });
    }

    api
      .get("/saas/company", { params: { page: 1, limit: 100 } })
      .then((res) => {
        const payload = res.data?.data || res.data;
        setCompanies(
          payload?.companies ||
            payload?.items ||
            payload?.companiesList ||
            []
        );
      })
      .catch(() => {});

    api
      .get("/saas/plan", { params: { page: 1, limit: 100 } })
      .then((res) => {
        const payload = res.data?.data || res.data;
        setPlans(payload?.plans || payload?.items || payload || []);
      })
      .catch(() => {});
  }, [id]);

  /* ================= PERMISSION ================= */

  if (loading) return <CircularProgress />;

  if (!hasPermission("saas.coupon_create") && isNew) {
    return (
      <Alert severity="error">
        You don't have permission to create coupons
      </Alert>
    );
  }

  if (!hasPermission("saas.coupon_update") && !isNew) {
    return (
      <Alert severity="error">
        You don't have permission to edit coupons
      </Alert>
    );
  }

  /* ================= UI ================= */

  return (
    <Box p={4} display="flex" justifyContent="center">
      <Paper elevation={6} sx={{ p: 5, maxWidth: 800, width: "100%", borderRadius: 4 }}>
        <Typography variant="h4" fontWeight={700} mb={3}>
          {isNew ? "Create Coupon" : "Edit Coupon"}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <form onSubmit={form.handleSubmit}>
          <Stack spacing={5}>

            {/* ================= Basic Information ================= */}
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Basic Information
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <RequiredTextField formik={form} name="code" label="Coupon Code" required disabled={!isNew} />

                <TextField
                  name="description"
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={form.values.description}
                  onChange={form.handleChange}
                />

                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={form.values.isActive}
                      onChange={form.handleChange}
                    />
                  }
                  label="Active Coupon"
                />
              </Stack>
            </Box>

            {/* ================= Discount Settings ================= */}
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Discount Settings
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type *</InputLabel>
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

                <RequiredTextField formik={form} name="discountValue" label="Discount Value" required type="number" />

                {form.values.discountType === "percentage" && (
                  <TextField
                    name="maxDiscountPaise"
                    label="Max Discount (₹)"
                    type="number"
                    fullWidth
                    value={form.values.maxDiscountPaise}
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    error={form.touched.maxDiscountPaise && Boolean(form.errors.maxDiscountPaise)}
                    helperText={form.touched.maxDiscountPaise && form.errors.maxDiscountPaise}
                  />
                )}
              </Stack>
            </Box>

            {/* ================= Usage & Validity ================= */}
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Usage & Validity
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <TextField
                  name="minSpendPaise"
                  label="Minimum Spend (₹)"
                  type="number"
                  fullWidth
                  value={form.values.minSpendPaise}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  error={form.touched.minSpendPaise && Boolean(form.errors.minSpendPaise)}
                  helperText={form.touched.minSpendPaise && form.errors.minSpendPaise}
                />

                <TextField
                  name="maxUses"
                  label="Max Uses (0 = unlimited)"
                  type="number"
                  fullWidth
                  value={form.values.maxUses}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  error={form.touched.maxUses && Boolean(form.errors.maxUses)}
                  helperText={form.touched.maxUses && form.errors.maxUses}
                />

                <TextField
                  type="datetime-local"
                  label="Valid From"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={new Date(form.values.validFrom).toISOString().slice(0, 16)}
                  onChange={(e) =>
                    form.setFieldValue("validFrom", new Date(e.target.value).getTime())
                  }
                />

                <TextField
                  type="datetime-local"
                  label="Valid To"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={new Date(form.values.validTo).toISOString().slice(0, 16)}
                  onChange={(e) =>
                    form.setFieldValue("validTo", new Date(e.target.value).getTime())
                  }
                />
              </Stack>
            </Box>

            {/* ================= Applicability ================= */}
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Applicability
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                {/* 'Applies To' removed - coupons are now scoped by eligible plans or company */}

                <FormControl fullWidth>
                  <InputLabel>Companies (leave empty for Global)</InputLabel>
                  <Select
                    multiple
                    name="companyIds"
                    value={form.values.companyIds}
                    onChange={(e) => form.setFieldValue('companyIds', e.target.value)}
                    input={<OutlinedInput label="Companies (leave empty for Global)" />}
                    renderValue={(selected) => (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {selected.map((id) => {
                          const company = companies.find((c) => c._id === id) || {};
                          return <Chip key={id} label={company.name || company.email || id} size="small" color="primary" />;
                        })}
                      </Stack>
                    )}
                  >
                    {companies.map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.name || c.email || c._id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Eligible Plans</InputLabel>
                  <Select
                    multiple
                    value={form.values.eligiblePlanCodes}
                    onChange={(e) =>
                      form.setFieldValue("eligiblePlanCodes", e.target.value)
                    }
                    input={<OutlinedInput label="Eligible Plans" />}
                    renderValue={(selected) => (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" color="primary" />
                        ))}
                      </Stack>
                    )}
                  >
                    {plans.map((p) => (
                      <MenuItem key={p._id || p.code} value={p.code || p._id}>
                        {p.name || p.code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* ================= Actions ================= */}
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" onClick={() => nav("/coupons")}>
                Cancel
              </Button>
              <Button variant="contained" size="large" type="submit">
                {isNew ? "Create Coupon" : "Update Coupon"}
              </Button>
            </Box>

          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
