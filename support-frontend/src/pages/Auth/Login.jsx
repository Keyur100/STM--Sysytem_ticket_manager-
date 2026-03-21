import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useFormik } from "formik";
import * as yup from "yup";
import { setAuth } from "../../store/slices/authSlice";
import api from "../../api/axios";
import { Box, TextField, Button, Paper, Typography, Link, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

export default function Login() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  // const loc = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const form = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: yup.object({
      email: yup.string().email().required(),
      password: yup.string().required(),
    }),
    onSubmit: async (v) => {
      const res = await api.post("/auth/login", v);
      const data = res.data;

      if (data.needDepartment) {
        // Navigate to department selection page
        nav("/select-department", {
          state: { user: data.user, memberships: data.memberships },
        });
      } else {
        dispatch(setAuth({ user: data.user, token: data.access }));
        window.localStorage.setItem("refresh_token", data.refresh);
        nav("/companies");
      }
    },
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
          <Box mt={1} textAlign="right">
            <Link component="button" variant="body2" onClick={() => setForgotOpen(true)}>Forgot password?</Link>
          </Box>
        </form>
        {/* Removed register prompt per UI request */}

        <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)}>
          <DialogTitle>Forgot Password</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="Email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setForgotOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setForgotLoading(true);
                try {
                  await api.post('/auth/forgot-password', { email: forgotEmail });
                  alert('If the account exists, a reset link has been sent');
                  setForgotOpen(false);
                } catch (err) {
                  alert(err?.response?.data?.message || err?.message || 'Request failed');
                } finally {
                  setForgotLoading(false);
                }
              }}
              disabled={forgotLoading}
              variant="contained"
            >Send</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
