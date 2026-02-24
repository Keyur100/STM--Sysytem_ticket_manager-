import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import api from "../../../api/axios";
import usePermissions from "../../../helpers/hooks/usePermissions";
import TableWrapper from "../../../components/common/TableWrapper";
import useDebounce from "../../../helpers/hooks/useDebounce";

export default function ModuleList() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, module: null });
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("moduleKey");
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/saas/module", { params: { page: page + 1, limit, q, order, orderBy } });
      setModules(res.data?.modules || res.data || []);
      setTotal(res.data?.total || (res.data?.modules?.length || res.data?.length || 0));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [page, limit, q, order, orderBy]);

   /** 🔹 Debounce search input */
    const debouncedSearch = useDebounce((v) => {
      setQ(v);
      setPage(0);
    }, 400);

  const handleDelete = async () => {
    try {
      await api.delete(`/saas/module/${deleteDialog.module._id}`);
      setDeleteDialog({ open: false, module: null });
      fetchModules();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete module");
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <h3 style={{ margin: 0 }}>Modules</h3>
          {hasPermission("saas.module_create") && (
            <Button component={Link} to="/modules/new" variant="contained">
              Add Module
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer>
          <TableWrapper
            data={modules}
            columns={[
              { field: 'moduleKey', label: 'Module Key', sortable: true },
              { field: 'displayName', label: 'Display Name' },
              { field: 'group', label: 'Group' },
              { field: 'actions', label: 'Actions', render: (r) => (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{(r.actions||[]).map(a => <Chip key={a.key} label={a.label} size="small" variant="outlined" />)}</Box>
              )},
              { field: 'isActive', label: 'Status', render: (r) => (
                <Chip label={r.isActive ? 'Active' : 'Inactive'} color={r.isActive ? 'success' : 'default'} size="small" />
              )}
            ]}
            total={total}
            page={page}
            rowsPerPage={limit}
            onPageChange={(p) => setPage(p)}
            onRowsPerPageChange={(n) => { setLimit(n); setPage(0); }}
            onSortChange={(field, dir) => { setOrderBy(field); setOrder(dir); }}
            order={order}
            orderBy={orderBy}
            onSearchChange= { debouncedSearch }
            searchPlaceHolder={'Search modules.'}
            onAdd={{ fn: () => nav('/modules/new'), perm: 'saas.module_create' }}
            onEdit={(r) => nav(`/modules/${r._id}/edit`)}
            onDelete={(r) => setDeleteDialog({ open: true, module: r })}
            editPerm={'saas.module_update'}
            deletePerm={'saas.module_delete'}
            addLabel={'Add Module'}
          />
        </TableContainer>

        {modules.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No modules found
          </Alert>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, module: null })}>
        <DialogTitle>Delete Module</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the module "{deleteDialog.module?.displayName}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, module: null })}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
