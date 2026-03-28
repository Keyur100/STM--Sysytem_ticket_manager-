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
  Chip,
} from '@mui/material';
import { useSelector } from 'react-redux';
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
  const [commentReply, setCommentReply] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState('');

  const auth = useSelector((s) => s.auth);
  const currentUser = auth?.user || {};
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

  const handleEditTicket = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(String(normalizeStatusValue(ticket.status) ?? ''));
    setNewPriority(ticket.priority || '');
    setCommentReply('');
    setStatusUpdateOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedTicket || newStatus === '') return;
    const ticketId = selectedTicket._id || selectedTicket.id || selectedTicket.ticket_id;
    if (!ticketId) {
      setMessage({ type: 'error', text: 'Cannot update ticket: missing ticket id' });
      return;
    }
    setUpdateLoading(true);
    try {
      const commentPayload = commentReply?.trim()
        ? [
            {
              comment: commentReply.trim(),
              datetime: new Date().toISOString().slice(0, 19).replace('T', ' '),
              user_id: currentUser._id || currentUser.id,
              user_name: currentUser.name || currentUser.username || 'Unknown',
              commentfrom: 'user',
              logedin_userid: currentUser._id || currentUser.id,
            },
          ]
        : [];
      await api.post(`/saas/ticket-sync/${ticketId}/status`, {
        status: Number(newStatus),
        priority: newPriority || undefined,
        comments_reply: commentPayload,
      });
      setMessage({ type: 'success', text: 'Ticket updated successfully' });
      setStatusUpdateOpen(false);
      setNewStatus('');
      setNewPriority('');
      setCommentReply('');
      fetchTickets();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
    } finally {
      setUpdateLoading(false);
    }
  };

  const supportTypeMap = {
    1: { label: 'New Feature', color: 'primary', bgcolor: '#bbdefb', text: '#0d47a1' },
    2: { label: 'Modification', color: 'warning', bgcolor: '#ffe0b2', text: '#e65100' },
    3: { label: 'Error', color: 'error', bgcolor: '#ffcdd2', text: '#b71c1c' },
    4: { label: 'Other', color: 'default', bgcolor: '#e0e0e0', text: '#424242' },
  };

  const statusMap = {
    0: { label: 'New', bgcolor: '#e3f2fd', color: '#1565c0' },
    1: { label: 'Active', bgcolor: '#e8f5e9', color: '#2e7d32' },
    2: { label: 'Hold', bgcolor: '#fff3e0', color: '#ef6c00' },
    3: { label: 'Complete', bgcolor: '#e8f5e9', color: '#2e7d32' },
    4: { label: 'Rejected', bgcolor: '#ffebee', color: '#c62828' },
  };

  function normalizeStatusValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }

  const parseCommentsReply = (ticket) => {
    const raw = ticket?.comments_reply || ticket?.commentsReply || ticket?.comments || [];
    if (Array.isArray(raw)) return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const columns = [
    {
      field: '_id',
      label: 'ID',
      sortable: true,
      width: 200,
      render: (r) => r._id || r.id || '—',
    },
    {
      field: 'code',
      label: 'Code',
      sortable: true,
      width: 150,
      render: (r) => r.code || '—',
    },
    {
      field: 'createdby',
      label: 'Created By',
      sortable: false,
      width: 180,
      render: (r) =>
        r.createdby?.name || r.createdBy?.name || r.createdby || r.createdBy || '—',
    },
    {
      field: 'module_name',
      label: 'Module',
      sortable: false,
      width: 180,
      render: (r) => r.module_name || r.moduleName || '—',
    },
    {
      field: 'title',
      label: 'Title',
      sortable: true,
      width: 320,
      render: (r) => {
        const supportType = normalizeStatusValue(r.support_types);
        const badge = supportTypeMap[supportType] || supportTypeMap[4];
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography noWrap sx={{ maxWidth: 220 }}>
              {r.title || '—'}
            </Typography>
            <Chip
              label={badge.label}
              size="small"
              sx={{
                backgroundColor: badge.bgcolor,
                color: badge.text,
                fontWeight: 600,
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'status',
      label: 'Status',
      sortable: false,
      width: 140,
      render: (r) => {
        const statusValue = normalizeStatusValue(r.status);
        const statusInfo = statusMap[statusValue] || {
          label: String(r.status || 'Unknown'),
          bgcolor: '#f5f5f5',
          color: '#424242',
        };
        return (
          <Chip
            label={statusInfo.label}
            size="small"
            sx={{
              backgroundColor: statusInfo.bgcolor,
              color: statusInfo.color,
              fontWeight: 700,
            }}
          />
        );
      },
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
          headerLabel="Support Tickets"
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
          onEdit={handleEditTicket}
          editPerm="ticket.update"
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
              <Typography><strong>Module:</strong> {selectedTicket.module_name || selectedTicket.moduleName || '—'}</Typography>
              <Typography><strong>Created By:</strong> {selectedTicket.createdby?.name || selectedTicket.createdBy?.name || selectedTicket.createdby || selectedTicket.createdBy || '—'}</Typography>
              <Typography><strong>Status:</strong> {selectedTicket.status !== undefined ? String(selectedTicket.status) : '—'}</Typography>
              <Typography><strong>Created:</strong> {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : '—'}</Typography>
              {parseCommentsReply(selectedTicket).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    Comments
                  </Typography>
                  {parseCommentsReply(selectedTicket).map((comment, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 1, backgroundColor: '#fafafa' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {comment.user_name || comment.userName || 'Unknown'} - {comment.commentfrom || comment.commentFrom || 'user'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {comment.datetime || comment.date || '—'}
                      </Typography>
                      <Typography sx={{ mt: 1 }}>{comment.comment || '—'}</Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {hasPermission('ticket.update') && (
            <Button
              variant="contained"
              onClick={() => {
                setSelectedTicket(selectedTicket);
                setNewStatus(String(normalizeStatusValue(selectedTicket?.status) ?? ''));
                setNewPriority(selectedTicket?.priority || '');
                setCommentReply('');
                setStatusUpdateOpen(true);
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
            <MenuItem value="0">New</MenuItem>
            <MenuItem value="1">Active</MenuItem>
            <MenuItem value="2">Hold</MenuItem>
            <MenuItem value="3">Complete</MenuItem>
            <MenuItem value="4">Rejected</MenuItem>
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
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Write reply"
            value={commentReply}
            onChange={(e) => setCommentReply(e.target.value)}
            margin="normal"
          />
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

