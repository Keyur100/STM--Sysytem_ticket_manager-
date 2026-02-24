import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import api from "../../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import usePermissions from "../../../helpers/hooks/usePermissions";

const schema = yup.object({
  moduleKey: yup
    .string()
    .required("Module Key is required")
    .matches(/^[a-z_]+$/, "Module Key must be lowercase with underscores"),
  displayName: yup.string().required("Display Name is required"),
  group: yup.string().required("Group is required"),
  isActive: yup.boolean(),
  actions: yup.array().of(
    yup.object({
      key: yup.string().required(),
      label: yup.string().required(),
    })
  ),
});

export default function ModuleForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState(null);
  const [actionKey, setActionKey] = useState("");
  const [actionLabel, setActionLabel] = useState("");

  const form = useFormik({
    initialValues: {
      moduleKey: "",
      displayName: "",
      group: "",
      isActive: true,
      actions: [],
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      try {
        setError(null);
        if (isNew) {
          await api.post("/saas/module", values);
        } else {
          await api.put(`/saas/module/${id}`, values);
        }
        nav("/modules");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to save module");
      }
    },
  });

  useEffect(() => {
    if (!isNew) {
      api
        .get(`/saas/module/${id}`)
        .then((r) => {
          form.setValues(r.data);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load module");
          setLoading(false);
        });
    }
  }, [id]);

  const handleAddAction = () => {
    if (!actionKey || !actionLabel) {
      setError("Please enter both Action Key and Label");
      return;
    }
    form.setFieldValue("actions", [
      ...form.values.actions,
      { key: actionKey, label: actionLabel },
    ]);
    setActionKey("");
    setActionLabel("");
  };

  const handleRemoveAction = (index) => {
    form.setFieldValue(
      "actions",
      form.values.actions.filter((_, i) => i !== index)
    );
  };

  if (loading) return <CircularProgress />;

  if (!hasPermission("saas.module_create") && isNew) {
    return <Alert severity="error">You don't have permission to create modules</Alert>;
  }

  if (!hasPermission("saas.module_update") && !isNew) {
    return <Alert severity="error">You don't have permission to edit modules</Alert>;
  }

  return (
    <Box p={2}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          {isNew ? "Create Module" : "Edit Module"}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={form.handleSubmit}>
          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid item xs={12} sm={6}>
              <TextField
                name="moduleKey"
                label="Module Key"
                fullWidth
                value={form.values.moduleKey}
                onChange={form.handleChange}
                error={!!form.errors.moduleKey}
                helperText={form.errors.moduleKey || "e.g., ticket_management"}
                disabled={!isNew}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="displayName"
                label="Display Name"
                fullWidth
                value={form.values.displayName}
                onChange={form.handleChange}
                error={!!form.errors.displayName}
                helperText={form.errors.displayName || "e.g., Ticket Management"}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="group"
                label="Group"
                fullWidth
                value={form.values.group}
                onChange={form.handleChange}
                error={!!form.errors.group}
                helperText={form.errors.group || "e.g., Ticketing"}
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
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, my: 2 }}>
                ✅ Actions/Permissions
              </Typography>
            </Grid>

            {/* Add Action */}
            <Grid item xs={12} sm={5}>
              <TextField
                label="Action Key"
                fullWidth
                size="small"
                value={actionKey}
                onChange={(e) => setActionKey(e.target.value)}
                placeholder="e.g., create, read, update"
              />
            </Grid>

            <Grid item xs={12} sm={5}>
              <TextField
                label="Action Label"
                fullWidth
                size="small"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                placeholder="e.g., Create Ticket"
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleAddAction}
                sx={{ height: "40px" }}
              >
                <AddIcon />
              </Button>
            </Grid>

            {/* Actions Table */}
            {form.values.actions.length > 0 && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                          <TableCell><strong>Action Key</strong></TableCell>
                          <TableCell><strong>Label</strong></TableCell>
                          <TableCell><strong>Action</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {form.values.actions.map((action, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>{action.key}</TableCell>
                            <TableCell>{action.label}</TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveAction(idx)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Submit */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                <Button variant="contained" type="submit">
                  {isNew ? "Create Module" : "Update Module"}
                </Button>
                <Button variant="outlined" onClick={() => nav("/modules")}>
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
