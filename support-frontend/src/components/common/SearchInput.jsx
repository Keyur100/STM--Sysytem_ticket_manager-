import React from "react";
import TextField from "@mui/material/TextField";
import useDebounce from "../../helpers/hooks/useDebounce";
export default function SearchInput({ value, onChange, placeholder }) {
  const deb = useDebounce(onChange, 400);
  return <TextField fullWidth defaultValue={value} onChange={(e) => deb(e.target.value)} placeholder={placeholder} />;
}
