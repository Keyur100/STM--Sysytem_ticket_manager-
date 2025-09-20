import React, { useState, useEffect, useCallback } from "react";
import { Box, Paper } from "@mui/material";
import TableWrapper from "../../components/common/TableWrapper";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useDebounce from "../../helpers/hooks/useDebounce";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function TagsList() {
  const [tags, setTags] = useState([]);
  const [page, setPage] = useState(0); // 0-based for MUI TablePagination
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");

  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetch = useCallback(async () => {
    const skip = page * limit;
    const res = await api.get("/tags", {
      params: { page: page + 1, limit, skip, search: q, sortBy: orderBy, sortOrder: order },
    });

    const payload = res.data;
    setTags(Array.isArray(payload) ? payload : payload.items || payload.data || []);
    setTotal(payload.total || payload.count || (Array.isArray(payload) ? payload.length : 0));
  }, [page, limit, q, order, orderBy]);

  useEffect(() => { fetch(); }, [fetch]);

  const debouncedSearch = useDebounce((v) => { setQ(v); setPage(0); }, 400);

  const handleDelete = async (row) => {
    await api.delete(`/tags/${row._id}`);
    fetch();
  };

  const columns = [
    { field: "name", label: "Name", sortable: true, width: 250 },
    { field: "slug", label: "Slug", sortable: true, width: 200 },
    { field: "isSystem", label: "System", sortable: true, width: 100, render: (r) => r.isSystem ? "Yes" : "No" },
  ];

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <TableWrapper
          data={tags}
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
          onAdd={{ fn: () => nav("/tags/new"), perm: "tag.create" }}
          onEdit={(r) => nav(`/tags/${r._id}/edit`)}
          onDelete={handleDelete}
          editPerm="tag.update"
          deletePerm="tag.delete"
          addLabel="Add Tag"
        />
      </Paper>
    </Box>
  );
}
