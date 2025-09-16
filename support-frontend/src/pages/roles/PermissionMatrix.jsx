import React, { useMemo } from "react";
import { Box, Checkbox, FormControlLabel, Paper, Typography } from "@mui/material";

export default React.memo(function PermissionMatrix({ permissions = [], value = [], onChange }) {
  // Group permissions by module
  const grouped = useMemo(() => {
    const map = {};
    permissions.forEach(p => {
      const [module, action] = p.split(".");
      if (!map[module]) map[module] = [];
      map[module].push(p);
    });
    return map;
  }, [permissions]);

  const toggle = (p) => {
    const next = value.includes(p) ? value.filter(x => x !== p) : [...value, p];
    onChange(next);
  };

  const toggleModule = (module) => {
    const allSelected = grouped[module].every(p => value.includes(p));
    const next = allSelected
      ? value.filter(p => !grouped[module].includes(p))
      : [...new Set([...value, ...grouped[module]])];
    onChange(next);
  };

  return (
    <Paper sx={{ p: 2 }}>
      {Object.entries(grouped).map(([module, perms]) => {
        const allSelected = perms.every(p => value.includes(p));
        return (
          <Box key={module} mb={2}>
            <FormControlLabel
              control={<Checkbox checked={allSelected} onChange={() => toggleModule(module)} />}
              label={<Typography variant="subtitle1" fontWeight="bold">{module.toUpperCase()}</Typography>}
            />
            <Box ml={3} display="grid" gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={1}>
              {perms.map(p => (
                <FormControlLabel
                  key={p}
                  control={<Checkbox checked={value.includes(p)} onChange={() => toggle(p)} />}
                  label={p.split(".")[1]}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
});
