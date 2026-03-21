import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import TableWrapper from "../../../components/common/TableWrapper";

export default function AddonsList() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, addon: null });
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const nav = useNavigate();

  const fetchAddons = async () => {
    try {
      setLoading(true);
      const res = await api.get("/saas/addons", { params: { page: page + 1, limit, q, order, orderBy } });
      const data = res.data?.data || res.data || [];
      // data might be array or object depending on backend wrapper
      const list = Array.isArray(data) ? data : (data.addons || data);
      setAddons(list || []);
      setTotal(res.data?.meta?.total || (list?.length || 0));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, [page, limit, q, order, orderBy]);

  const handleDelete = async () => {
    try {
      await api.delete(`/saas/addons/${deleteDialog.addon._id}`);
      setDeleteDialog({ open: false, addon: null });
      fetchAddons();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete add-on");
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableWrapper
          headerLabel="Add-ons"
          data={addons}
          columns={[
            { field: 'name', label: 'Name', sortable: true },
            { field: 'value', label: 'Value' },
            { field: 'type', label: 'Type' },
            { field: 'pricePaise', label: 'Price', render: r => (r.pricePaise ? `₹${(r.pricePaise/100).toFixed(2)}` : '-') },
            { field: 'provides', label: 'Provides', render: r => (typeof r.provides === 'object' ? JSON.stringify(r.provides) : '') },
            { field: 'isActive', label: 'Status', render: r => (r.isActive ? 'Active' : 'Inactive') }
          ]}
          total={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(p) => setPage(p)}
          onRowsPerPageChange={(n) => { setLimit(n); setPage(0); }}
          onSortChange={(field, dir) => { setOrderBy(field); setOrder(dir); }}
          order={order}
          orderBy={orderBy}
          onSearchChange={(v) => { setQ(v); setPage(0); }}
          searchPlaceHolder={'Search add-ons.'}
          onAdd={{ fn: () => nav('/addons/new'), perm: 'saas.addon_create' }}
          onEdit={(r) => nav(`/addons/${r._id}/edit`)}
          onDelete={(r) => setDeleteDialog({ open: true, addon: r })}
          editPerm={'saas.addon_update'}
          deletePerm={'saas.addon_delete'}
          addLabel={'Add Add-on'}
        />

        {addons.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No add-ons found
          </Alert>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, addon: null })}>
        <DialogTitle>Delete Add-on</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the add-on "{deleteDialog.addon?.name}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, addon: null })}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
