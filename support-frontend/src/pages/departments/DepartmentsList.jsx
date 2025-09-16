import React, { useEffect, useState } from "react";
import { Box, Paper, Button } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function DepartmentsList() {
  const [depts, setDepts] = useState([]);
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetch = async () => { const res = await api.get("/departments"); setDepts(res.data); };
  useEffect(() => { fetch(); }, []);

  const handleDelete = async (row) => { if (!confirm("Delete department?")) return; await api.delete(`/departments/${row._id}`); fetch(); };

  const columns = [
    { field: "name", label: "Name" },
    { field: "isSystem", label: "System", render: r => r.isSystem ? "Yes" : "No" }
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between">
          <h3>Departments</h3>
          {hasPermission("department.create") && <Button component={Link} to="/departments/new">Add new</Button>}
        </Box>

        <TableWrapper
          data={depts}
          columns={columns}
          onEdit={(r) => nav(`/departments/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="department.update"
          deletePerm="department.delete"
        />
      </Paper>
    </Box>
  );
}
