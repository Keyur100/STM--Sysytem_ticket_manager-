import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import api from '../../../api/axios';
import TableWrapper from '../../../components/common/TableWrapper';
import useDebounce from '../../../helpers/hooks/useDebounce';
import usePermissions from '../../../helpers/hooks/usePermissions';

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { hasPermission } = usePermissions();

  // Fetch tickets from Laravel API (encrypted)
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/saas/ticket-sync', {
        params: { page: page + 1, limit, search },
      });
      const data = res.data;
      setTickets(Array.isArray(data) ? data : data.tickets || []);
      setTotal(data.total || data.length || 0);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setMessage({ type: 'error', text: 'Failed to load tickets' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const debouncedSearch = useDebounce((v) => {
    setSearch(v);
    setPage(0);
  }, 400);

  const handleStatusUpdate = async () => {
    if (!selectedTicket || !newStatus) return;
    setUpdateLoading(true);
    try {
      await api.post(`/saas/ticket-sync/${selectedTicket._id}/status`, {
        status: newStatus,
        priority: newPriority || undefined,
      });
      setMessage({ type: 'success', text: 'Ticket updated successfully' });
      setStatusUpdateOpen(false);
      setNewStatus('');
      setNewPriority('');
      fetchTickets();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
    } finally {
      setUpdateLoading(false);
    }
  };

  const columns = [
    {
      field: 'code',
      label: 'Ticket Code',
      sortable: true,
      width: 150,
      render: (r) => r.code || '—',
    },
    {
      field: 'title',
      label: 'Title',
      sortable: true,
      width: 300,
      render: (r) => r.title || '—',
    },
    {
      field: 'status',
      label: 'Status',
      width: 120,
      render: (r) => (
        <Box
          sx={{
            display: 'inline-block',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            backgroundColor:
              r.status === 'open' ? '#ffebee' :
              r.status === 'in_progress' ? '#fff3e0' :
              r.status === 'closed' ? '#e8f5e9' : '#f5f5f5',
            color:
              r.status === 'open' ? '#d32f2f' :
              r.status === 'in_progress' ? '#f57c00' :
              r.status === 'closed' ? '#388e3c' : '#666',
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          {r.status?.toUpperCase() || '—'}
        </Box>
      ),
    },
    {
      field: 'priority',
      label: 'Priority',
      width: 100,
      render: (r) => (
        <Box
          sx={{
            display: 'inline-block',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            backgroundColor:
              r.priority === 'high' ? '#ffcdd2' :
              r.priority === 'medium' ? '#fff9c4' : '#e1f5fe',
            color:
              r.priority === 'high' ? '#c62828' :
              r.priority === 'medium' ? '#f57f17' : '#01579b',
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}
        >
          {r.priority?.toUpperCase() || '—'}
        </Box>
      ),
    },
  ];

  return (
    <Box p={2}>
      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <TableWrapper
          data={tickets}
          columns={columns}
          total={total}
          page={page}
          rowsPerPage={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(n) => {
            setLimit(n);
            setPage(0);
          }}
          onSearchChange={debouncedSearch}
          searchPlaceHolder="Search by code or title"
          onView={(ticket) => {
            setSelectedTicket(ticket);
            setDetailsOpen(true);
          }}
          loading={loading}
        />
      </Paper>

      {/* Ticket Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ticket Details</DialogTitle>
        <DialogContent dividers>
          {selectedTicket ? (
            <Box sx={{ pt: 2 }}>
              <Typography><strong>Code:</strong> {selectedTicket.code}</Typography>
              <Typography><strong>Title:</strong> {selectedTicket.title}</Typography>
              <Typography><strong>Description:</strong> {selectedTicket.description || '—'}</Typography>
              <Typography><strong>Status:</strong> {selectedTicket.status?.toUpperCase()}</Typography>
              <Typography><strong>Priority:</strong> {selectedTicket.priority?.toUpperCase()}</Typography>
              <Typography><strong>Created:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}</Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {hasPermission('ticket.update') && (
            <Button
              variant="contained"
              onClick={() => {
                setStatusUpdateOpen(true);
                setNewStatus(selectedTicket?.status || '');
              }}
            >
              Update Status
            </Button>
          )}
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateOpen} onClose={() => setStatusUpdateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Ticket Status</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <TextField
            fullWidth
            select
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            margin="normal"
          >
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </TextField>
          <TextField
            fullWidth
            select
            label="Priority (optional)"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            margin="normal"
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={updateLoading || !newStatus}
          >
            {updateLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
