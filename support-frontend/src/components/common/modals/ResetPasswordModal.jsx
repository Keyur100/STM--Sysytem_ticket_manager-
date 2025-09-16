// src/components/modals/ResetPasswordModal.js
import React, { useState } from "react";
import GlobalModal from "./AddNewModal";
import api from "../../../api/axios";
import AlertDialog from "../../../components/common/modals/AlertDialog";

export default function ResetPasswordModal({ open, onClose }) {
  const [alert, setAlert] = useState({ open: false, title: "", message: "" });

  const handleSubmit = async (vals) => {
    if (vals.newPassword !== vals.confirmPassword) {
      setAlert({ open: true, title: "Error", message: "Passwords do not match!" });
      return;
    }

    try {
      await api.post("/user/reset-password", {
        oldPassword: vals.oldPassword,
        newPassword: vals.newPassword,
      });
      onClose();
    } catch (err) {
      setAlert({ open: true, title: "Error", message: err.response?.data?.message || err.message });
    }
  };

  return (
    <>
      <GlobalModal
        open={open}
        title="Reset Password"
        fields={[
          { name: "oldPassword", label: "Old Password", type: "password" },
          { name: "newPassword", label: "New Password", type: "password" },
          { name: "confirmPassword", label: "Confirm Password", type: "password" },
        ]}
        onSubmit={handleSubmit}
        onClose={onClose}
      />

      <AlertDialog
        open={alert.open}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, open: false })}
      />
    </>
  );
}
