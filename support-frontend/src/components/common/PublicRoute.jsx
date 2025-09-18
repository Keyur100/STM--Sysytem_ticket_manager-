// src/components/common/PublicRoute.js
import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import routesConfig from "../../routesConfig";
import usePermissions from "../../helpers/hooks/usePermissions";

export default function PublicRoute({ children }) {
  const auth = useSelector((s) => s.auth);
  const { hasPermission } = usePermissions();

  // Determine the first permitted route dynamically
  const firstPermitted = useMemo(() => {
    if (!auth?.user) return null;

    if (hasPermission("*")) return "/dashboard"; // superadmin default

    const route = routesConfig.find((r) => hasPermission(r.permission));
    return route ? route.path : null;
  }, [auth?.user, hasPermission]);

  // If user is logged in, redirect to their first permitted route
  if (auth?.user && Object.keys(auth?.user).length>0) {
    return <Navigate to={firstPermitted || "/dashboard"} replace />;
  }

  return children;
}
