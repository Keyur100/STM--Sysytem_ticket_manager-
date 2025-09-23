import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useDebounce from "../../helpers/hooks/useDebounce";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("email");

  const nav = useNavigate();

  const fetch = useCallback(async () => {
    const skip = page * limit;
    const res = await api.get("/users", {
      params: { page: page + 1, limit, skip, search: q, sortBy: orderBy, sortOrder: order },
    });

    const payload = res.data;
    setUsers(Array.isArray(payload) ? payload : payload.items || payload.data || []);
    setTotal(payload.total || payload.count || (Array.isArray(payload) ? payload.length : 0));
  }, [page, limit, q, order, orderBy]);

  useEffect(() => { fetch(); }, [fetch]);

  const debouncedSearch = useDebounce((v) => { setQ(v); setPage(0); }, 400);

  const handleDelete = async (row) => {
    // if (!window.confirm("Delete user?")) return;
    await api.delete(`/users/${row._id}`);
    fetch();
  };

  const columns = [
    { field: "email", label: "Email", sortable: true, width: 250 },
    { field: "name", label: "Name", sortable: true, width: 200, render: (r) => r.name || "-" },
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <TableWrapper
          data={users}
          columns={columns}
          total={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(n) => { setLimit(n); setPage(0); }}
          onSortChange={(field, dir) => { setOrderBy(field); setOrder(dir); }}
          order={order}
          orderBy={orderBy}
          onSearchChange={debouncedSearch}
          onAdd={{ fn: () => nav("/users/new"), perm: "user.create" }}
          onEdit={(r) => nav(`/users/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="user.update"
          deletePerm="user.delete"
          addLabel="Add User"
        />
      </Paper>
    </Box>
  );
}
