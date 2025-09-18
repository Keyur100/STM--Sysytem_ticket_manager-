import React, { useEffect, useState } from "react";
import { Box, Paper, Button, TextField } from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "../../api/axios";
import PermissionMatrix from "../../pages/roles/PermissionMatrix";
import { superAdminPermissions } from "../../helpers/permissionList";
import { useNavigate, useParams } from "react-router-dom";

const schema = yup.object({ name: yup.string().required() });

export default function RoleForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const [role, setRole] = useState(null);

  const form = useFormik({
    initialValues:{ name:"", permissions: [] },
    validationSchema: schema,
    onSubmit: async (v) => {
      if (isNew) await api.post("/roles", v);
      else await api.patch(`/roles/${id}`, v);
      nav("/roles");
    }
  });

  useEffect(()=>{ 
    if (!isNew) 
    api.get("/roles").
    then(r=>{ 
      const found = r.data.items.find(x=>x._id===id); 
      if (found) { setRole(found); 
        form.setValues({ name: found.name, permissions: found.permissions || [] }) } }) }, [id]);

  const isSystem = role?.isSystem === true;

  return (
    <Box p={2}><Paper sx={{p:2}}>
      <form onSubmit={form.handleSubmit}>
        <TextField name="name" value={form.values.name} onChange={form.handleChange} label="Role name" fullWidth sx={{mb:2}} disabled={isSystem} />
        <PermissionMatrix permissions={superAdminPermissions} value={form.values.permissions} onChange={(v)=>form.setFieldValue("permissions", v)} />
        {isSystem && <Box mt={1} sx={{color:"gray"}}>This is a system role and cannot be modified.</Box>}
        <Box mt={2}><Button variant="contained" type="submit" disabled={isSystem}>Save</Button></Box>
      </form>
    </Paper></Box>
  );
}
