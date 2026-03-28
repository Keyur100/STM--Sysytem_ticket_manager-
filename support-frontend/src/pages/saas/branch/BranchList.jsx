import React, { useEffect, useState, useCallback } from "react";
import { Box, Paper, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/axios";
import endpoints from "../../../api/saas/endpoints";
import TableWrapper from "../../../components/common/TableWrapper";
import useDebounce from "../../../helpers/hooks/useDebounce";

export default function BranchList() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const companyIdFilter = params.get("companyId");

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewBranch, setViewBranch] = useState(null);
  const [viewCompanyName, setViewCompanyName] = useState('');
  const [viewClientUsers, setViewClientUsers] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const skip = page * limit;
      const paramsObj = {
        page: page + 1,
        limit,
        skip,
        search: q,
        sortBy: orderBy,
        sortOrder: order,
      };
      // If a companyId query param is present, include it as a filter
      if (companyIdFilter) paramsObj.companyId = companyIdFilter;

      const res = await api.get(endpoints.branch.list, { params: paramsObj });
      const payload = res.data || res;
      const list = Array.isArray(payload) ? payload : payload.items || payload.data || [];
      setBranches(list);
      setTotal(payload.total || payload.count || list.length);
    } catch (err) {
      console.error('Failed to fetch branches', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, order, orderBy, companyIdFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const debouncedSearch = useDebounce((v) => { setQ(v); setPage(0); }, 400);

  const openView = async (b) => {
    setViewLoading(true);
    setViewBranch(null);
    setViewCompanyName('');
    setViewClientUsers([]);
    try {
      const res = await api.get(endpoints.branch.get(b._id));
      const branchData = res.data || res;
      setViewBranch(branchData);

      // Fetch linked company name only for view (if available)
      const companyId = branchData.companyId || branchData.company || branchData.company?._id || companyIdFilter;
      if (companyId) {
        try {
          const cRes = await api.get(`/saas/company/${companyId}`);
          const cdata = cRes.data || cRes;
          setViewCompanyName(cdata.name || cdata.company?.name || '');

          // If full-details provided, pick clientUsers
          const full = cRes.data || {};
          const users = full.clientUsers || full.data?.clientUsers || [];
          const filtered = Array.isArray(users) ? users.filter(u => !u.branchId || String(u.branchId) === String(branchData._id)) : [];
          setViewClientUsers(filtered);
        } catch (e) {
          // ignore company fetch errors, show branch info anyway
        }
      }

      setViewDialogOpen(true);
    } catch (err) {
      console.error('Failed to load branch details', err);
      setViewDialogOpen(true);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete branch?')) return;
    try {
      await api.delete(endpoints.branch.remove(id));
      fetch();
    } catch (err) {
      console.error('Failed to delete branch', err);
    }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          
        </Box>

        <Box sx={{ mt: 2 }}>    
          <TableWrapper
            headerLabel="Branches"
            data={branches}
            loading={loading}
            columns={[
              { field: 'name', label: 'Name', sortable: true, render: (r) => r.name || '-' },
              { field: 'code', label: 'Code', sortable: true, render: (r) => r.code || '-' },
              { field: 'companyName', label: 'Company', render: (r) => r.companyName || r.company?.name || '-' },
              { field: 'email', label: 'Email', render: (r) => r.email || '-' },
              { field: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
              { field: 'address', label: 'Address', render: (r) => r.address || '-' },
              { field: 'status', label: 'Status', render: (r) => r.status || '-' },
            ]}
            total={total}
            page={page}
            rowsPerPage={limit}
            onPageChange={(p) => setPage(p)}
            onRowsPerPageChange={(n) => { setLimit(n); setPage(0); }}
            onSortChange={(f, d) => { setOrderBy(f); setOrder(d); }}
            order={order}
            orderBy={orderBy}
            onSearchChange={debouncedSearch}
            searchPlaceHolder={'Search branches by name or code.'}
            onEdit={(r) => navigate(`/branches/${r._id}/edit`)}
            onView={(r) => openView(r)}
            onDelete={(r) => handleDelete(r._id)}
            hideAdd={true}
            hideDelete={true}
        hideEdit={true}

          />
        </Box>

        {/* View Branch Dialog */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Branch Details</DialogTitle>
          <DialogContent>
            {viewLoading ? (
              <div>Loading...</div>
            ) : viewBranch ? (
              <Box>
                <Typography><strong>Name:</strong> {viewBranch.name}</Typography>
                <Typography><strong>Code:</strong> {viewBranch.code || '-'}</Typography>
                <Typography><strong>Company:</strong> {viewCompanyName || viewBranch.companyName || '-'}</Typography>
                <Typography><strong>Address:</strong> {viewBranch.address || '-'}</Typography>
                <Typography><strong>Phone:</strong> {viewBranch.phone || '-'}</Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Client Users</Typography>
                  {viewClientUsers.length === 0 ? <Typography variant="body2">No users found</Typography> : (
                    viewClientUsers.map((u) => (
                      <Paper key={u._id} sx={{ p: 1, mt: 1, backgroundColor: 'background.paper' }}>
                        <Typography><strong>{u.name}</strong> — {u.email}</Typography>
                        <Typography variant="caption">{u.phone || '-'}</Typography>
                      </Paper>
                    ))
                  )}
                </Box>
              </Box>
            ) : (
              <Typography>No data</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
