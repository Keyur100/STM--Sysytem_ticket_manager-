import React from "react";
import { Box, Button, FormControlLabel, Checkbox } from "@mui/material";

export default function MembershipList({
  memberships,
  roles,
  departments,
  primaryIndex,
  setPrimaryIndex,
  setMemberships,
  hasPermission,
  setAlert,
}) {
  const handlePrimaryChange = (index) => {
    if (!hasPermission("user.update") && !hasPermission("user.create")) return;
    setPrimaryIndex(index);
    setMemberships(memberships.map((m, i) => ({ ...m, isPrimary: i === index })));
  };

  const handleRemove = (index) => {
    if (!hasPermission("user.update") && !hasPermission("user.create")) return;

    const updated = memberships.filter((_, i) => i !== index);
    if (updated.length === 0) {
      setAlert({ open: true, title: "Validation", message: "At least one membership required" });
      return;
    }

    if (primaryIndex === index) {
      updated[0].isPrimary = true;
      setPrimaryIndex(0);
    } else if (primaryIndex > index) {
      setPrimaryIndex((p) => p - 1);
    }

    setMemberships(updated);
  };

  return (
    <Box mt={2}>
      {memberships.map((m, i) => (
        <Box
          key={i}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <span>
            Role: {roles.find((r) => r._id === m.role)?.name} | Dept:{" "}
            {departments.find((d) => d._id === m.department)?.name}
          </span>
          <Box>
            <FormControlLabel
              control={
                <Checkbox checked={m.isPrimary} onChange={() => handlePrimaryChange(i)} />
              }
              label="Primary"
            />
            <Button color="error" onClick={() => handleRemove(i)}>
              Remove
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
