import React, { useEffect } from "react";
import { Box, Paper, Button, TextField } from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../api/axios";
import { useNavigate, useParams } from "react-router-dom";

const schema = yup.object({ name: yup.string().required() });

export default function TagForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();

  const form = useFormik({
    initialValues: { name: "", slug: "", isSystem: false },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (isNew) await api.post("/tags", v);
      else await api.patch(`/tags/${id}`, v);
      nav("/tags");
    }
  });

  useEffect(() => {
    if (!isNew) {
      api.get(`/tags`).then((r) => {
        const found = r.data.find((x) => x._id === id);
        if (found) form.setValues({ name: found.name, slug: found.slug, isSystem: found.isSystem || false });
      });
    }
  }, [id]);

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <form onSubmit={form.handleSubmit}>
          <TextField name="name" label="Name" fullWidth value={form.values.name} onChange={form.handleChange} sx={{ mb: 2 }} />
          <TextField name="slug" label="Slug" fullWidth value={form.values.slug} onChange={form.handleChange} sx={{ mb: 2 }} />
          <Box mt={2}><Button variant="contained" type="submit">Save</Button></Box>
        </form>
      </Paper>
    </Box>
  );
}
