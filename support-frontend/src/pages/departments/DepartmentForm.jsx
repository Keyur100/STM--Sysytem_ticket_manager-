import React, { useEffect, useState } from "react";
import { Box, Paper, Button, TextField, FormControlLabel, Switch } from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../api/axios";
import { useNavigate, useParams } from "react-router-dom";

const schema = yup.object({ name: yup.string().required() });

export default function DepartmentForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const [admins, setAdmins] = useState([]);

  // useEffect(() => {
  //   api.get("/users").then((r) => setAdmins(r.data)).catch(() => {});
  // }, []);

  const form = useFormik({
    initialValues: { name: "", isSystem: false, hidden: false, assignedAdmins: [] },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (isNew) await api.post("/departments", v);
      else await api.patch(`/departments/${id}`, v);
      nav("/departments");
    }
  });

  useEffect(() => {
    if (!isNew) {
      api.get("/departments").then((r) => {
        const found = r.data.items.find((x) => x._id === id);
        if (found) form.setValues({ name: found.name, isSystem: found.isSystem || false, hidden: found.hidden || false, assignedAdmins: found.assignedAdmins || [] });
      });
    }
  }, [id]);

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={form.handleSubmit}>
          <TextField name="name" label="Name" fullWidth value={form.values.name} onChange={form.handleChange} sx={{ mb: 2 }} />
          <FormControlLabel control={<Switch checked={form.values.hidden} onChange={(e) => form.setFieldValue("hidden", e.target.checked)} />} label="Hidden" />
          <Box mt={2}><Button variant="contained" type="submit">Save</Button></Box>
        </form>
      </Paper>
    </Box>
  );
}
