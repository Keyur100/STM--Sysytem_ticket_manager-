// src/components/modals/ProfileModal.js
import React, { useEffect, useState } from "react";
import GlobalModal from "./AddNewModal";
import api from "../../../api/axios";

export default function ProfileModal({ open, onClose }) {
  const [initialValues, setInitialValues] = useState({ name: "" });

  useEffect(() => {
    if (open) {
      api.get("/me").then(res => {
        const user = res.data;
        setInitialValues({ name: user.name || "" });
      }).catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (vals) => {
    await api.put("/me", vals); // update profile API
    onClose();
  };

  return (
    <GlobalModal
      open={open}
      title="Update Profile"
      fields={[{ name: "name", label: "Name" }]}
      onSubmit={handleSubmit}
      onClose={onClose}
      initialValues={initialValues}
    />
  );
}
