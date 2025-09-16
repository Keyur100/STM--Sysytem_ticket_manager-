import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { useFormik } from "formik";
import * as yup from "yup";
import { setAuth } from "../../store/slices/authSlice";
import api from "../../api/axios";
import { Box, TextField, Button, Paper, Typography, Link, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

export default function Login() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const loc = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: yup.object({
      email: yup.string().email().required(),
      password: yup.string().required()
    }),
    onSubmit: async (v) => {
      const res = await api.post("/auth/login", v);
      const data = res.data;
      dispatch(setAuth({ user: data.user, token: data.access }));
      window.localStorage.setItem("refresh_token", data.refresh);
      nav(loc.state?.from?.pathname || "/dashboard");
    }
  });

  return (
    <Box display="flex" minHeight="100vh" alignItems="center" justifyContent="center">
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h6">Sign in</Typography>
        <form onSubmit={form.handleSubmit}>
          <TextField
            fullWidth
            name="email"
            label="Email"
            margin="normal"
            value={form.values.email}
            onChange={form.handleChange}
          />
          <TextField
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            margin="normal"
            value={form.values.password}
            onChange={form.handleChange}
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
          <Button fullWidth type="submit" sx={{ mt: 2 }} variant="contained">
            Login
          </Button>
        </form>
        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            Don't have an account?{" "}
            <Link component={RouterLink} to="/register">Register</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
