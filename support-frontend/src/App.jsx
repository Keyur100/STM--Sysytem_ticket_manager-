import React, { Suspense, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { useSelector } from "react-redux";

import Loader from "./components/common/Loader";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicRoute from "./components/common/PublicRoute";
import AppShell from "./pages/AppShell";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import routesConfig from "./routesConfig";
import DepartmentSelect from "./pages/Auth/DepartmentSelction";

// Recursive function to render routes including nested ones
const renderRoutes = (routes) =>
  routes.flatMap((r) => {
    const base = (
      <Route
        key={r.path}
        path={r.path}
        element={
          <ProtectedRoute permission={r.permission}>
            <r.component />
          </ProtectedRoute>
        }
      />
    );

    if (r.routes?.length) {
      const nested = r.routes.map((nr) => (
        <Route
          key={`${r.path}/${nr.path}`}
          path={`${r.path}/${nr.path}`}
          element={
            <ProtectedRoute permission={nr.permission}>
              <nr.component />
            </ProtectedRoute>
          }
        />
      ));
      return [base, ...nested];
    }

    return base;
  });

export default function App() {
  const auth = useSelector((s) => s.auth);

  const firstPermitted = useMemo(() => {
    if (!auth?.user?.roles?.permissions) return null;
    const perms = auth.user.roles.permissions;
    if (perms.includes("*")) return { path: "/dashboard" };
    return routesConfig.find((r) => perms.includes(r.permission)) || null;
  }, [auth?.user?.roles?.permissions]);

  return (
    <SnackbarProvider maxSnack={4} preventDuplicate>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/select-department"
            element={
              <PublicRoute>
                <DepartmentSelect />
              </PublicRoute>
            }
          />

          {/* Protected routes wrapped in AppShell */}
          <Route element={<AppShell />}>
            {/* Default entry */}
            <Route
              path="/"
              element={
                firstPermitted ? (
                  <Navigate to={firstPermitted.path} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Render all routes dynamically */}
            {renderRoutes(routesConfig)}

            {/* 404 fallback */}
            <Route
              path="*"
              element={<div style={{ padding: 40 }}>404 Not Found</div>}
            />
          </Route>
        </Routes>
      </Suspense>
    </SnackbarProvider>
  );
}
