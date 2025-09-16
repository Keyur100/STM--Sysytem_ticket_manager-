import React, { useEffect, useState } from "react";
import { Box, Paper, Button } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function RolesList() {
  const [roles, setRoles] = useState([]);
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetch = async () => { const r = await api.get("/roles"); setRoles(r.data); };
  useEffect(() => { fetch(); }, []);

  const handleDelete = async (row) => {
    if (row.isSystem) { alert("Cannot delete system role"); return; }
    if (!hasPermission("role.delete")) { alert("No permission to delete"); return; }
    if (!confirm("Delete role?")) return;
    await api.delete(`/roles/${row._id}`);
    fetch();
  };

  const handleEdit=(r)=>{
    hasPermission("role.update") ? nav(`/roles/${r._id}/edit`) : null
  }

  const columns = [
    { field: "name", label: "Name" },
    { field: "permissions", label: "Permissions", render: r => (r.permissions.includes("*") ? "All Permissions (*)" : (r.permissions || []).join(", ")) }
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between">
          <h3>Roles</h3>
          {hasPermission("role.create") && <Button component={Link} to="/roles/new">Add new</Button>}
        </Box>

        <TableWrapper
          data={roles}
          columns={columns}
          onEdit={(r) => handleEdit(r)}
          onDelete={handleDelete}
          editPerm="role.update"
          deletePerm="role.delete"
        />
      </Paper>
    </Box>
  );
}
