import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Box,
  TableContainer,
  Paper,
  TableSortLabel,
  TablePagination,
  Toolbar,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import usePermissions from "../../helpers/hooks/usePermissions";
import AlertDialog from "./modals/AlertDialog";

export default function TableWrapper({
  data = [],
  columns = [],
  total = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  order = "asc",
  orderBy = "",
  onSortChange,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  editPerm,
  deletePerm,
  hideDelete = false,
  addLabel = "Add New",
}) {
  const { hasPermission } = usePermissions();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    onSortChange?.(property, isAsc ? "desc" : "asc");
  };

  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete && selectedRow) onDelete(selectedRow);
    setOpenDialog(false);
    setSelectedRow(null);
  };

  return (
    <Box>
      {/* 🔹 Toolbar */}
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Records
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Search inside toolbar */}
          <TextField
            size="small"
            placeholder="Search..."
            onChange={(e) => onSearchChange?.(e.target.value)}
          />

          {onAdd && hasPermission(onAdd.perm) && (
            <Button
              variant="contained"
              startIcon={<AddCircleIcon />}
              onClick={onAdd.fn}
              sx={{ borderRadius: 2 }}
            >
              {addLabel}
            </Button>
          )}
        </Box>
      </Toolbar>

      {/* 🔹 Responsive Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={c.field}
                  sortDirection={orderBy === c.field ? order : false}
                  sx={{ width: c.width }}
                >
                  {c.sortable ? (
                    <TableSortLabel
                      active={orderBy === c.field}
                      direction={orderBy === c.field ? order : "asc"}
                      onClick={() => handleRequestSort(c.field)}
                    >
                      <b>{c.label}</b>
                    </TableSortLabel>
                  ) : (
                    <b>{c.label}</b>
                  )}
                </TableCell>
              ))}
              {(hasPermission(editPerm) || (!hideDelete && hasPermission(deletePerm))) && (
                <TableCell align="center">
                  <b>Actions</b>
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((row) => (
              <TableRow key={row._id || row.userId} hover>
                {columns.map((c) => (
                  <TableCell key={c.field}>
                    {c.render ? c.render(row) : row[c.field]}
                  </TableCell>
                ))}

                {(hasPermission(editPerm) || (!hideDelete && hasPermission(deletePerm))) && (
                  <TableCell align="center">
                    {hasPermission(editPerm) && onEdit && (
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => onEdit(row)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {!hideDelete && hasPermission(deletePerm) && onDelete && (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteClick(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}

            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  No records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 🔹 Pagination */}
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* 🔹 Delete Confirmation */}
      {!hideDelete && (
        <AlertDialog
          open={openDialog}
          title="Delete Confirmation"
          message="Are you sure you want to delete this item? This action cannot be undone."
          type="confirm"
          onClose={() => setOpenDialog(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </Box>
  );
}
