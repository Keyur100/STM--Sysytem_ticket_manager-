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
  Paper,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../../api/axios';

const STEP_LABELS = {
  '1': 'Step 1: Company details sync',
  '2': 'Step 2: Permission changes (added/removed)',
};

export default function UpgradeDowngradeSyncModal({ open, onClose, companyId }) {
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [company, setCompany] = useState(null);
  const [isNotUpgrade, setIsNotUpgrade] = useState(false);

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

  const fetchCompanyDetails = async () => {
    if (!companyId) return;
    try {
      const res = await api.get(`/saas/company/${companyId}/details`);
      setCompany(res.data.company || null);
      
      // Check if this is an upgrade/downgrade by checking for previousSubscriptionId
      const hasUpgradeFlag = res.data.company?.subscription?.previousSubscriptionId;
      if (!hasUpgradeFlag) {
        setIsNotUpgrade(true);//false
      }
    } catch (err) {
      console.error('Failed to fetch company details', err);
    }
  };

  useEffect(() => {
    if (open) {
      setIsNotUpgrade(false);
      fetchLogs();
      fetchCompanyDetails();
    }
  }, [open, companyId]);

  const runStep = async (step) => {
    if (!companyId) return;

    setRunning((r) => ({ ...r, [step]: true }));

    try {
      const res = await api.post(
        `/saas/company/${companyId}/upgrade/${step}`
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
    logs.find((l) => String(l.step) === String(step) && l.type === 'upgrade') || null;

  const logsForStep = (step) =>
    logs.filter((l) => String(l.step) === String(step) && l.type === 'upgrade');

  const hasStepSuccess = (step) =>
    logs.some((l) => String(l.step) === String(step) && l.status === 'success' && l.type === 'upgrade');

  const toggleExpanded = (id) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Upgrade/Downgrade Sync (2 Steps)</DialogTitle>

      <DialogContent dividers>
        {isNotUpgrade ? (
          <Alert severity="warning">
            This subscription is not an upgrade or downgrade. Use "Stepwise Sync" for regular sync.
          </Alert>
        ) : loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {['1', '2'].map((s) => {
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
                        disabled={disabled || isNotUpgrade}
                      >
                        {isRunning ? (
                          <CircularProgress size={16} />
                        ) : (
                          'RUN'
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
                                    mt: 1,
                                    fontSize: '0.75rem'
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
            Recent upgrade sync logs
          </Typography>

          <List dense>
            {logs.filter((l) => l.type === 'upgrade').slice(0, 5).map((l) => (
              <ListItem key={l._id}>
                <ListItemText
                  primary={`Step ${l.step} — ${l.status}`}
                  secondary={
                    l.message || JSON.stringify(l.remoteResponse || {})
                  }
                />
              </ListItem>
            ))}
            {logs.filter((l) => l.type === 'upgrade').length === 0 && (
              <Typography variant="caption" sx={{ p: 1 }}>
                No upgrade sync logs yet
              </Typography>
            )}
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
