import React, { useEffect, useState, useCallback } from "react";
import { Box, Paper, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, IconButton } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/axios";
import endpoints from "../../../api/saas/endpoints";

export default function BranchList() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const companyId = params.get("companyId");

  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', companyName: '', name: '', tagline: '', address: '', logo: '', phone: '', phone2: '', email: '', gstn: '', pan: '', status: 'active', contactInfo: '', contactPerson: { name: '', email: '', phone: '' } });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewBranch, setViewBranch] = useState(null);
  const [viewClientUsers, setViewClientUsers] = useState([]);
  const [viewCompanyName, setViewCompanyName] = useState('');
  const [viewLoading, setViewLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await api.get(endpoints.branch.list, { params: { companyId } });
      
      setBranches(res.items || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const openView = async (b) => {
    setViewLoading(true);
    setViewBranch(null);
    setViewClientUsers([]);
    setViewCompanyName('');
    try {
      // fetch branch detail (may include companyId)
      const res = await api.get(endpoints.branch.get(b._id));
      const branchData = res.data || res;
      setViewBranch(branchData);

      const companyIdForBranch = branchData.companyId || branchData.company || branchData.company?._id || companyId;
      if (companyIdForBranch) {
        const cRes = await api.get(`/saas/company/${companyIdForBranch}/full-details`);
        const cdata = cRes.data || {};
        setViewCompanyName(cdata.company?.name || cdata.name || '');
        const users = cdata.clientUsers || [];
        // filter users for this branch if branchId stored on user
        const filtered = Array.isArray(users) ? users.filter(u => !u.branchId || String(u.branchId) === String(branchData._id)) : [];
        setViewClientUsers(filtered);
      }
      setViewDialogOpen(true);
    } catch (err) {
      console.error('Failed to load branch details', err);
      setViewDialogOpen(true);
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    // If companyId not provided, fetch company list for the create dialog
    const fetchCompanies = async () => {
      try {
        const res = await api.get(endpoints.company.list);
        const items = res.items || res.data || res.companies || res;
        setCompanies(Array.isArray(items) ? items : (items.items || []));
      } catch (err) {
        console.error('Failed to load companies', err);
      }
    };

    if (!companyId) fetchCompanies();
  }, [companyId]);

  const openNew = () => { setEditing(null); setForm({}); setDialogOpen(true); };
  const openEdit = (b) => { setEditing(b); setForm(b); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(endpoints.branch.update(editing._id), form);
      } else {
        const targetCompanyId = companyId || form.companyId || form.company?._id || form.companyId;
        if (!targetCompanyId) throw new Error('Please select a company for the branch');
        await api.post(endpoints.branch.create, { ...form, companyId: targetCompanyId });
      }
      setDialogOpen(false);
      fetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete branch?")) return;
    try { await api.delete(endpoints.branch.remove(id)); fetch(); } catch (err) { console.error(err); }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Branches {companyId ? `(Company: ${companyId})` : ''}</Typography>
          <Box>
            <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mr: 1 }}>Back</Button>
            <Button variant="contained" onClick={openNew}>Add Branch</Button>
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
            {loading ? <div>Loading...</div> : (
              branches.length === 0 ? <div>No branches</div> : (
                branches.map((b) => (
                  <Paper key={b._id} sx={{ p: 1, mt: 1, display: 'flex', justifyContent: 'space-between', backgroundColor: 'background.paper' }}>
                    <Box>
                      <Typography fontWeight={700}>{b.name}</Typography>
                      <Typography variant="caption">{b.address || '-'} • {b.phone || '-'}</Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => openView(b)} sx={{ mr: 1 }} title="View">
                        <VisibilityIcon />
                      </IconButton>
                      <Button size="small" onClick={() => openEdit(b)} sx={{ mr: 1 }}>Edit</Button>
                      <Button size="small" color="error" onClick={() => handleDelete(b._id)}>Delete</Button>
                    </Box>
                  </Paper>
                ))
              )
            )}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Code" value={form.code || ''} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} sx={{ mt: 1 }} />
          {!companyId && (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="company-select-label">Company</InputLabel>
              <Select
                labelId="company-select-label"
                label="Company"
                value={form.companyId || ''}
                onChange={(e) => setForm(f => ({ ...f, companyId: e.target.value }))}
              >
                {companies.map((c) => (
                  <MenuItem key={c._id || c.id} value={c._id || c.id}>{c.name || c.companyName || c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField fullWidth label="Company Name" value={form.companyName || ''} onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Name" value={form.name || ''} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Tagline" value={form.tagline || ''} onChange={(e) => setForm(f => ({ ...f, tagline: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Address" value={form.address || ''} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Phone" value={form.phone || ''} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Phone 2" value={form.phone2 || ''} onChange={(e) => setForm(f => ({ ...f, phone2: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Email" value={form.email || ''} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="GSTN" value={form.gstn || ''} onChange={(e) => setForm(f => ({ ...f, gstn: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="PAN" value={form.pan || ''} onChange={(e) => setForm(f => ({ ...f, pan: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Logo" value={form.logo || ''} onChange={(e) => setForm(f => ({ ...f, logo: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Contact Info (JSON)" value={form.contactInfo || ''} onChange={(e) => setForm(f => ({ ...f, contactInfo: e.target.value }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Contact Person Name" value={form.contactPerson?.name || ''} onChange={(e) => setForm(f => ({ ...f, contactPerson: {...f.contactPerson, name: e.target.value} }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Contact Person Email" value={form.contactPerson?.email || ''} onChange={(e) => setForm(f => ({ ...f, contactPerson: {...f.contactPerson, email: e.target.value} }))} sx={{ mt: 1 }} />
          <TextField fullWidth label="Contact Person Phone" value={form.contactPerson?.phone || ''} onChange={(e) => setForm(f => ({ ...f, contactPerson: {...f.contactPerson, phone: e.target.value} }))} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
