import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import usePermissions from "../../helpers/hooks/usePermissions";
import AlertDialog from "./modals/AlertDialog";

export default function TableWrapper({
  data = [],
  columns = [],
  onAdd,
  onEdit,
  onDelete,
  editPerm,
  deletePerm,
  hideDelete = false, // 🔹 new flag
}) {
  const { hasPermission } = usePermissions();

  // For delete confirmation
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete && selectedRow) {
      onDelete(selectedRow);
    }
    setOpenDialog(false);
    setSelectedRow(null);
  };

  return (
    <Box>
      {onAdd && hasPermission(onAdd.perm) && (
        <IconButton onClick={onAdd.fn}>
          <AddIcon />
        </IconButton>
      )}

      <Table>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.field}>
                <b>{c.label}</b>
              </TableCell>
            ))}
            {(hasPermission(editPerm) || (!hideDelete && hasPermission(deletePerm))) && (
              <TableCell>
                <b>Actions</b>
              </TableCell>
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row) => (
            <TableRow key={row._id}>
              {columns.map((c) => (
                <TableCell key={c.field}>
                  {c.render ? c.render(row) : row[c.field]}
                </TableCell>
              ))}

              {(hasPermission(editPerm) || (!hideDelete && hasPermission(deletePerm))) && (
                <TableCell>
                  {hasPermission(editPerm) && onEdit && (
                    <IconButton onClick={() => onEdit(row)}>
                      <EditIcon />
                    </IconButton>
                  )}
                  {!hideDelete && hasPermission(deletePerm) && onDelete && (
                    <IconButton onClick={() => handleDeleteClick(row)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
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
