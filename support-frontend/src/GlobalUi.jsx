// src/components/common/GlobalUI.jsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import Loader from "./components/common/Loader";
import AlertDialog from "./components/common/modals/AlertDialog";
import { clearError } from "./store/slices/uiSlice";

export default function GlobalUI() {
  const { loading, error } = useSelector((state) => state.ui);
  const dispatch = useDispatch();

  return (
    <>
      {loading && <Loader />}
      {error && (
        <AlertDialog
          open={!!error}
          title="Error"
          message={error}
          onClose={() => dispatch(clearError())}
        />
      )}
    </>
  );
}
