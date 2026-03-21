import React from 'react';
import { TextField } from '@mui/material';

// Props: name, label, required, formik (optional), value, onChange, onBlur, helperText, ...rest
export default function RequiredTextField(props) {
  const { formik, name, label, required, helperText, ...rest } = props;

  // Support two modes:
  // - formik bag (has .values/.touched/.errors/.handleChange)
  // - plain form object used by stepper (keys directly on the object)
  const valuesSource = formik && typeof formik.values !== 'undefined' ? formik.values : formik || {};
  const touchedSource = formik && typeof formik.touched !== 'undefined' ? formik.touched : {};
  const errorsSource = formik && typeof formik.errors !== 'undefined' ? formik.errors : {};

  const getByPath = (obj, path) => {
    if (!obj || !path) return undefined;
    const parts = String(path).split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[p];
    }
    return cur;
  };

  const showError = name && Boolean(getByPath(touchedSource, name) && getByPath(errorsSource, name));
  const errorText = showError ? getByPath(errorsSource, name) : helperText;
  const displayLabel = required ? `${label} *` : label;

  const handleChangeFn = props.onChange || (formik && typeof formik.handleChange === 'function' ? formik.handleChange : undefined);
  const handleBlurFn = props.onBlur || (formik && typeof formik.handleBlur === 'function' ? formik.handleBlur : undefined);

  return (
    <TextField
      name={name}
      label={displayLabel}
      required={required}
      error={!!showError}
      helperText={errorText}
      value={(valuesSource && typeof name !== 'undefined') ? (getByPath(valuesSource, name) ?? '') : (props.value ?? '')}
      onChange={handleChangeFn}
      onBlur={handleBlurFn}
      fullWidth
      {...rest}
    />
  );
}
