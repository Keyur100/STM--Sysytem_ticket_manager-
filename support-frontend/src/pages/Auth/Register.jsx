import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../api/axios";
import { Box, TextField, Button, Paper, Typography, Link, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

export default function Register() {
  const nav = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useFormik({
    initialValues: { name: "", email: "", password: "" },
    validationSchema: yup.object({
      name: yup.string().required("Name is required"),
      email: yup.string().email("Invalid email").required("Email is required"),
      password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required")
    }),
    onSubmit: async (values, { setSubmitting, setErrors }) => {
      try {
        const res = await api.post("/auth/register", values);
        if (res.data.success) nav("/login");
      } catch (err) {
        setErrors({ email: err.response?.data?.message || "Registration failed" });
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <Box display="flex" minHeight="100vh" alignItems="center" justifyContent="center">
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h6">Register</Typography>
        <form onSubmit={form.handleSubmit}>
          <TextField
            fullWidth
            name="name"
            label="Name"
            margin="normal"
            value={form.values.name}
            onChange={form.handleChange}
            error={Boolean(form.errors.name)}
            helperText={form.errors.name}
          />
          <TextField
            fullWidth
            name="email"
            label="Email"
            margin="normal"
            value={form.values.email}
            onChange={form.handleChange}
            error={Boolean(form.errors.email)}
            helperText={form.errors.email}
          />
          <TextField
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            margin="normal"
            value={form.values.password}
            onChange={form.handleChange}
            error={Boolean(form.errors.password)}
            helperText={form.errors.password}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button fullWidth type="submit" sx={{ mt: 2 }} variant="contained" disabled={form.isSubmitting}>
            Register
          </Button>
        </form>
        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            Already have an account?{" "}
            <Link component={RouterLink} to="/login">Login</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
