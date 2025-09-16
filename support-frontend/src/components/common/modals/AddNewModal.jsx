// src/components/common/GlobalModal.js
import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";

export default function GlobalModal({ open, title, fields = [{name:"name", label:"Name"}], onSubmit, onClose }) {
  const [vals, setVals] = useState({});

  useEffect(() => { 
    if (!open) setVals({});
  }, [open]);

  const handleChange = (name, value) => setVals(prev => ({ ...prev, [name]: value }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {fields.map(f => (
          <TextField
            key={f.name}
            fullWidth
            margin="dense"
            label={f.label}
            type={f.type || "text"}
            value={vals[f.name] || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            onSubmit && onSubmit(vals);
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
