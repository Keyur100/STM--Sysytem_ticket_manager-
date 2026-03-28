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
  Stack,
  Tooltip,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";

import usePermissions from "../../helpers/hooks/usePermissions";
import AlertDialog from "./modals/AlertDialog";

export default function TableWrapper({
  headerLabel = "Records",
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
  searchPlaceHolder,
  onAdd,
  onEdit,
  onDelete,
  onView,
  editPerm,
  deletePerm,
  hideDelete = false,
  hideEdit = false,
  hideView = false,
  hideAdd = false,
  addLabel = "Add New",
}) {
  const { hasPermission } = usePermissions();

  const [searchText, setSearchText] = useState("");
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

  // ✏️ Edit logic
  const canEdit = (row) => {
    if (!hasPermission(editPerm) || hideEdit || !onEdit) return false;

    if (headerLabel === "Companies") {
      return row.status === "draft";
    }

    return true;
  };

  // 👁 View logic
  const canView = (row) => {
    if (!onView || hideView) return false;

    if (headerLabel === "Companies") {
      return row.status !== "draft";
    }

    return true;
  };

  // Show actions column
  const canShowActionsColumn =
    (hasPermission(editPerm) && !hideEdit && onEdit) ||
    (!hideDelete && hasPermission(deletePerm) && onDelete) ||
    (onView && !hideView);

  return (
    <Box>
      {/* 🔹 Toolbar */}
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {headerLabel}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            size="small"
            placeholder={searchPlaceHolder || "Search..."}
            value={searchText}
            onChange={(e) => {
              const v = e.target.value;
              setSearchText(v);
              onSearchChange?.(v);
            }}
          />

          {onAdd && !hideAdd && hasPermission(onAdd.perm) && (
            <Button
              variant="contained"
              startIcon={<AddCircleIcon />}
              onClick={onAdd.fn}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {addLabel}
            </Button>
          )}
        </Box>
      </Toolbar>

      {/* 🔹 Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          overflowX: "auto",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
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

              {canShowActionsColumn && (
                <TableCell align="center">
                  <b>Actions</b>
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((row) => {
              const showDelete =
                !hideDelete && hasPermission(deletePerm) && onDelete;

              const showEdit =
                hasPermission(editPerm) && !hideEdit && onEdit;

              const showView = onView && !hideView;

              return (
                <TableRow
                  key={row._id || row.userId}
                  hover
                  sx={{ "&:hover": { backgroundColor: "action.hover" } }}
                >
                  {columns.map((c) => (
                    <TableCell key={c.field}>
                      {c.render ? c.render(row) : row[c.field]}
                    </TableCell>
                  ))}

                  {canShowActionsColumn && (
                    <TableCell align="center">
                      <Stack direction="row" justifyContent="center" spacing={1}>
                        
                        {/* ✏️ Edit */}
                        {showEdit && (
                          <Tooltip
                            title={
                              headerLabel === "Companies" &&
                              row.status !== "draft"
                                ? "Only draft companies can be edited"
                                : "Edit"
                            }
                            arrow
                          >
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                disabled={!canEdit(row)}
                                onClick={() =>
                                  canEdit(row) && onEdit(row)
                                }
                                sx={{
                                  opacity: canEdit(row) ? 1 : 0.4,
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}

                        {/* 🗑 Delete */}
                        {showDelete && (
                          <Tooltip title="Delete" arrow>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleDeleteClick(row)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* 👁 View */}
                        {showView && (
                          <Tooltip
                            title={
                              headerLabel === "Companies" &&
                              row.status === "draft"
                                ? "Draft cannot be viewed"
                                : "View"
                            }
                            arrow
                          >
                            <span>
                              <IconButton
                                color="secondary"
                                size="small"
                                disabled={!canView(row)}
                                onClick={() =>
                                  canView(row) && onView(row)
                                }
                                sx={{
                                  opacity: canView(row) ? 1 : 0.4,
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (canShowActionsColumn ? 1 : 0)}
                  align="center"
                >
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
        onRowsPerPageChange={(e) =>
          onRowsPerPageChange(parseInt(e.target.value, 10))
        }
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* 🔹 Delete Dialog */}
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