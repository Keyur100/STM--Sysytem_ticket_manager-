import React, { useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material";

export default function MembershipSelector({
  roles,
  departments,
  memberships,
  setMemberships,
  setPrimaryIndex,
  hasPermission,
  setAlert,
}) {
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const handleAdd = () => {
    if (!hasPermission("user.update") && !hasPermission("user.create")) return;

    if (!selectedRole || !selectedDept) {
      setAlert({ open: true, title: "Validation", message: "Select role & department" });
      return;
    }

    if (memberships.length >= 5) {
      setAlert({ open: true, title: "Validation", message: "Max 5 memberships allowed" });
      return;
    }

    if (memberships.some((m) => m.role === selectedRole && m.department === selectedDept)) {
      setAlert({ open: true, title: "Validation", message: "Duplicate role+department not allowed" });
      return;
    }

    if (memberships.some((m) => m.department === selectedDept)) {
      setAlert({ open: true, title: "Validation", message: "Department already has a role" });
      return;
    }

    const newMembership = { role: selectedRole, department: selectedDept, isPrimary };
    let updated = [...memberships, newMembership];

    if (isPrimary || memberships.length === 0) {
      updated = updated.map((m, idx) =>
        idx === updated.length - 1 ? { ...m, isPrimary: true } : { ...m, isPrimary: false }
      );
      setPrimaryIndex(updated.length - 1);
    }

    setMemberships(updated);
    setSelectedRole("");
    setSelectedDept("");
    setIsPrimary(false);
  };

  return (
    <Box display="flex" gap={2} mt={2} alignItems="center">
      <FormControl sx={{ minWidth: 220 }}>
        <InputLabel>Role</InputLabel>
        <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
          {roles.map((r) => (
            <MenuItem key={r._id} value={r._id}>
              {r.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 220 }}>
        <InputLabel>Department</InputLabel>
        <Select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
          {departments.map((d) => (
            <MenuItem key={d._id} value={d._id}>
              {d.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={<Checkbox checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />}
        label="Primary"
      />
      <Button variant="contained" onClick={handleAdd}>
        Add
      </Button>
    </Box>
  );
}
