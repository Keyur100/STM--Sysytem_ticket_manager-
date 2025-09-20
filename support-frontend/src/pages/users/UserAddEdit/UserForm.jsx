import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import ImageUpload from "../../../components/common/ImageUpload";
import MembershipSelector from "./MembershipSelector";
import MembershipList from "./MembershipList";
import usePermissions from "../../../helpers/hooks/usePermissions";
import AlertDialog from "../../../components/common/modals/AlertDialog";

export default function UserForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    avatar: null,
  });
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [primaryIndex, setPrimaryIndex] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState({ open: false, title: "", message: "" });

  // Fetch roles, departments, and user if editing
  useEffect(() => {
    api.get("/roles").then((r) => setRoles(r.data.items)).catch(() => {});
    api.get("/departments").then((r) => setDepartments(r.data.items)).catch(() => {});

    if (!isNew) {
      api.get(`/users/${id}`).then((r) => {
        const data = r.data;
        setForm({
          email: data.email,
          name: data.name,
          password: "", // don't prefill
          avatar: data.avatar || null,
        });

        const ms = (data.memberships || []).map((m) => ({
          role: m.roleId?._id || m.role,
          department: m.departmentId?._id || m.department,
          isPrimary: m.isPrimary,
        }));
        setMemberships(ms);

        const primary = ms.findIndex((m) => m.isPrimary);
        setPrimaryIndex(primary >= 0 ? primary : null);
      });
    }
  }, [id, isNew]);

  // Validation
  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    if (isNew && !form.password) errs.password = "Password is required";
    if (!form.name) errs.name = "Name is required";
    if (memberships.length === 0)
      errs.memberships = "At least one membership required";
    if (memberships.filter((m) => m.isPrimary).length !== 1)
      errs.memberships = "Exactly one membership must be primary";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const payload = { ...form, memberships };

      if (isNew && hasPermission("user.create")) {
        await api.post("/users", payload);
      } else if (!isNew && hasPermission("user.update")) {
        if (!form.password) delete payload.password;
        await api.patch(`/users/${id}`, payload);
      }

      nav("/users");
    } catch (err) {
      setAlert({ open: true, title: "Error", message: err.message });
    }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          margin="normal"
          label="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={Boolean(errors.email)}
          helperText={errors.email}
          disabled={!hasPermission("user.update") && !isNew}
        />

        {isNew && (
          <TextField
            fullWidth
            margin="normal"
            type={showPassword ? "text" : "password"}
            label="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={Boolean(errors.password)}
            helperText={errors.password}
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
              ),
            }}
          />
        )}

        <TextField
          fullWidth
          margin="normal"
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={Boolean(errors.name)}
          helperText={errors.name}
          disabled={!hasPermission("user.update") && !isNew}
        />

        <MembershipSelector
          roles={roles}
          departments={departments}
          memberships={memberships}
          setMemberships={setMemberships}
          primaryIndex={primaryIndex}
          setPrimaryIndex={setPrimaryIndex}
          hasPermission={hasPermission}
          setAlert={setAlert}
        />

        <MembershipList
          memberships={memberships}
          roles={roles}
          departments={departments}
          primaryIndex={primaryIndex}
          setPrimaryIndex={setPrimaryIndex}
          setMemberships={setMemberships}
          hasPermission={hasPermission}
          setAlert={setAlert}
        />

        {errors.memberships && (
          <Box color="error.main" mt={1}>
            {errors.memberships}
          </Box>
        )}

        <Box mt={2}>
          <ImageUpload
            value={form.avatar}
            onComplete={(u) => setForm({ ...form, avatar: u })}
          />
        </Box>

        <Box mt={2}>
          {((isNew && hasPermission("user.create")) ||
            (!isNew && hasPermission("user.update"))) && (
            <Button variant="contained" onClick={handleSubmit}>
              Save
            </Button>
          )}
        </Box>
      </Paper>

      <AlertDialog
        open={alert.open}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, open: false })}
      />
    </Box>
  );
}
