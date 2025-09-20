import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import usePermissions from "../../helpers/hooks/usePermissions";
import useDebounce from "../../helpers/hooks/useDebounce";

export default function RolesList() {
  const [roles, setRoles] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");

  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetch = useCallback(async () => {
    const skip = page * limit;
    const res = await api.get("/roles", {
      params: {
        page: page + 1,
        limit,
        skip,
        search: q,
        sortBy: orderBy,
        sortOrder: order,
      },
    });

    const payload = res.data;
    setRoles(Array.isArray(payload) ? payload : payload.items || payload.data || []);
    setTotal(payload.total || payload.count || (Array.isArray(payload) ? payload.length : 0));
  }, [page, limit, q, order, orderBy]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const debouncedSearch = useDebounce((v) => {
    setQ(v);
    setPage(0);
  }, 400);

  const handleDelete = async (row) => {
    if (row.isSystem) {
      alert("Cannot delete system role");
      return;
    }
    if (!hasPermission("role.delete")) {
      alert("No permission to delete");
      return;
    }
    if (!window.confirm("Delete role?")) return;
    await api.delete(`/roles/${row._id}`);
    fetch();
  };

  const handleEdit = (r) => {
    hasPermission("role.update") ? 
    nav(`/roles/${r._id}/edit`) :
     null;
  };

  const columns = [
    { field: "name", label: "Name", sortable: true },
    {
      field: "permissions",
      label: "Permissions",
      render: (r) =>
        r.permissions?.includes("*")
          ? "All Permissions (*)"
          : (r.permissions || []).join(", "),
    },
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <TableWrapper
          data={roles}
          columns={columns}
          total={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(n) => {
            setLimit(n);
            setPage(0);
          }}
          onSortChange={(field, dir) => {
            setOrderBy(field);
            setOrder(dir);
          }}
          order={order}
          orderBy={orderBy}
          onSearchChange={debouncedSearch}
          onAdd={{ fn: () => nav("/roles/new"), perm: "role.create" }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          editPerm="role.update"
          deletePerm="role.delete"
          addLabel="Add Role"
        />
      </Paper>
    </Box>
  );
}
