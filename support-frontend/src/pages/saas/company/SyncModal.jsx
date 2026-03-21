import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
  Typography,
  Collapse,
  IconButton,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../../api/axios';

const STEP_LABELS = {
  '1': 'Create company / branches / admin',
  '2': 'Assign plan / orders / transactions',
  '3': 'Assign permissions (module keys)',
  '4': 'Financial year / Serial numbers',
  '5': 'General settings'
};

export default function SyncModal({ open, onClose, companyId }) {
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const fetchLogs = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await api.get(`/saas/company/${companyId}/sync/logs`, { params: { _ts: Date.now() } });
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to fetch sync logs', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (open) fetchLogs();
  }, [open, companyId]);


  const runStep = async (step) => {
    if (!companyId) return;

    setRunning((r) => ({ ...r, [step]: true }));

    try {
      const res = await api.post(
        `/saas/company/${companyId}/provision/step/${step}`
      );
      await fetchLogs();
      return res.data;
    } catch (err) {
      await fetchLogs();
      return { error: err.response?.data?.message || err.message };
    } finally {
      setRunning((r) => ({ ...r, [step]: false }));
    }
  };

  const lastStatusForStep = (step) =>
    logs.find((l) => String(l.step) === String(step)) || null;

  const logsForStep = (step) =>
    logs.filter((l) => String(l.step) === String(step));

  const hasStepSuccess = (step) =>
    logs.some((l) => String(l.step) === String(step) && l.status === 'success');

  const toggleExpanded = (id) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Stepwise Sync</DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {['1', '2', '3', '4', '5'].map((s) => {
              const last = lastStatusForStep(s);
              const history = logsForStep(s);
              const isRunning = !!running[s];

              let disabled = false;

              if (s === '1') {
                disabled = isRunning || hasStepSuccess('1');
              } else if (s === '2') {
                disabled =
                  isRunning ||
                  !hasStepSuccess('1') ||
                  hasStepSuccess('2');
              } else if (s === '3') {
                disabled =
                  isRunning ||
                  !hasStepSuccess('2') ||
                  hasStepSuccess('3');
              } else if (s === '4') {
                disabled =
                  isRunning ||
                  !hasStepSuccess('3') ||
                  hasStepSuccess('4');
              } else if (s === '5') {
                disabled =
                  isRunning ||
                  !hasStepSuccess('4') ||
                  hasStepSuccess('5');
              }

              return (
                <Box key={s}>
                  <ListItem divider>
                    <ListItemText
                      primary={STEP_LABELS[s]}
                      secondary={
                        last
                          ? `${last.status?.toUpperCase()} — ${last.message || ''}`
                          : 'Not executed yet'
                      }
                    />

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => runStep(s)}
                        disabled={disabled}
                      >
                        {isRunning ? (
                          <CircularProgress size={16} />
                        ) : (
                          'Run'
                        )}
                      </Button>

                      <IconButton
                        size="small"
                        onClick={() => toggleExpanded(s)}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                  </ListItem>

                  <Collapse in={!!expanded[s]} timeout="auto" unmountOnExit>
                    <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
                      <Typography variant="subtitle2">
                        History for step {s}
                      </Typography>

                      {history.length === 0 ? (
                        <Typography variant="caption">
                          No history
                        </Typography>
                      ) : (
                        <List dense>
                          {history.map((h) => (
                            <ListItem
                              key={h._id}
                              alignItems="flex-start"
                              sx={{
                                flexDirection: 'column',
                                alignItems: 'stretch'
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  width: '100%'
                                }}
                              >
                                <ListItemText
                                  primary={`${new Date(
                                    h.createdAt
                                  ).toLocaleString()} — ${h.status?.toUpperCase()}`}
                                          secondary={
                                            h.remoteResponse?.message || h.message || ''
                                          }
                                />

                                <Button
                                  size="small"
                                  onClick={() => toggleExpanded(h._id)}
                                >
                                  View JSON
                                </Button>
                              </Box>

                              <Collapse
                                in={!!expanded[h._id]}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box
                                  component="pre"
                                  sx={{
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: 300,
                                    overflow: 'auto',
                                    backgroundColor: '#f5f5f5',
                                    p: 1,
                                    mt: 1
                                  }}
                                >
                                  {JSON.stringify(
                                    h.remoteResponse?.errors || h.remoteResponse || h,
                                    null,
                                    2
                                  )}
                                </Box>
                              </Collapse>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Paper>
                  </Collapse>
                </Box>
              );
            })}
          </List>
        )}

        <Box mt={2}>
          <Typography variant="caption">
            Recent logs (latest entries)
          </Typography>

          <List dense>
            {logs.slice(0, 10).map((l) => (
              <ListItem key={l._id}>
                <ListItemText
                  primary={`Step ${l.step} — ${l.status}`}
                  secondary={
                    l.message || JSON.stringify(l.remoteResponse || {})
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}