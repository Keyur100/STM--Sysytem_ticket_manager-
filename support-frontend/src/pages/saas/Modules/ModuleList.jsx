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

export default function ModuleList() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, module: null });
  const nav = useNavigate();
  const { hasPermission } = usePermissions();

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/saas/module");
      setModules(res.data?.modules || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

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
            <Button component={Link} to="/saas/modules/new" variant="contained">
              Add Module
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Module Key</strong></TableCell>
                <TableCell><strong>Display Name</strong></TableCell>
                <TableCell><strong>Group</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modules.map((module) => (
                <TableRow key={module._id} hover>
                  <TableCell>{module.moduleKey}</TableCell>
                  <TableCell>{module.displayName}</TableCell>
                  <TableCell>{module.group}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {module.actions?.map((action) => (
                        <Chip
                          key={action.key}
                          label={action.label}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={module.isActive ? "Active" : "Inactive"}
                      color={module.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {hasPermission("saas.module_update") && (
                        <IconButton
                          size="small"
                          onClick={() => nav(`/saas/modules/${module._id}/edit`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {hasPermission("saas.module_delete") && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, module })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
