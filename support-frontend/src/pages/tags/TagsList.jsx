import React, { useEffect, useState } from "react";
import { Box, Paper, Button } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function TagsList() {
  const [tags, setTags] = useState([]);
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetch = async () => { const res = await api.get("/tags"); setTags(res.data); };
  useEffect(() => { fetch(); }, []);

  const handleDelete = async (row) => { if (!confirm("Delete tag?")) return; await api.delete(`/tags/${row._id}`); fetch(); };

  const columns = [
    { field: "name", label: "Name" },
    { field: "slug", label: "Slug" },
    { field: "isSystem", label: "System", render: r => r.isSystem ? "Yes" : "No" }
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between">
          <h3>Tags</h3>
          {hasPermission("tag.create") && <Button component={Link} to="/tags/new">Add new</Button>}
        </Box>

        <TableWrapper
          data={tags}
          columns={columns}
          onEdit={(r) => nav(`/tags/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="tag.update"
          deletePerm="tag.delete"
        />
      </Paper>
    </Box>
  );
}
