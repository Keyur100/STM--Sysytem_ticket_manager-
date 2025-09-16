import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper, Button } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import Pagination from "../../components/common/Pagination";
import SearchInput from "../../components/common/SearchInput";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useDebounce from "../../helpers/hooks/useDebounce";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetch = useCallback(async () => {
    const skip = (page - 1) * limit;
    const res = await api.get("/users", { params: { page, limit, skip, search: q } });
    const payload = res.data;
    setUsers(Array.isArray(payload) ? payload : (payload.items || payload.data || []));
    setTotal(payload.total || payload.count || (Array.isArray(payload) ? payload.length : 0));
  }, [page, limit, q]);

  useEffect(() => { fetch(); }, [fetch]);

  const deb = useDebounce((v) => { setQ(v); setPage(1); }, 400);
  const handleDelete = async (row) => { if (!confirm("Delete user?")) return; await api.delete(`/users/${row.userId}`); fetch(); };

  const columns = [
    { field: "email", label: "Email" },
    { field: "name", label: "Name", render: r => r.name || "-" }
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" gap={2} alignItems="center" mb={2}>
          <SearchInput onChange={deb} placeholder="Search users" />
          {hasPermission("user.create") && <Button component={Link} to="/users/new" variant="contained">Add new</Button>}
        </Box>

        <TableWrapper
          data={users}
          columns={columns}
          onEdit={(r) => nav(`/users/${r.userId}/edit`)}
          onDelete={handleDelete}
          editPerm="user.update"
          deletePerm="user.delete"
        />

        <Pagination page={page} count={Math.max(1, Math.ceil(total / limit))} onChange={setPage} limit={limit} onLimitChange={(n) => { setLimit(n); setPage(1); }} />
      </Paper>
    </Box>
  );
}
