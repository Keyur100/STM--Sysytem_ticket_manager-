// src/components/common/ProtectedRoute.js
import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function ProtectedRoute({ children, permission }) {
  const auth = useSelector((s) => s.auth);
  const loc = useLocation();
  const { hasPermission } = usePermissions();

  // If user is not logged in or has no permissions
  if (!auth?.token || !auth?.user?.roles?.permissions?.length) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // If a permission is required and user doesn't have it
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
