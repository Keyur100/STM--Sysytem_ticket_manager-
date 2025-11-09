// src/routesConfig.js
import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import CategoryIcon from "@mui/icons-material/Category";
import LabelIcon from "@mui/icons-material/Label";
import SummarizeIcon from "@mui/icons-material/Summarize";
import WorkIcon from "@mui/icons-material/Work";
import  Business  from "@mui/icons-material/Business";
import { LocalOffer } from "@mui/icons-material";

// Each route can have child routes
const routesConfig = [
  {
    label: "Dashboard",
    icon: DashboardIcon,
    path: "/dashboard",
    component: React.lazy(() => import("./pages/Dashboard")),
    permission: "dashboard.read",
  },
  {                                                                                                                                                                                                                    
    label: "Users",
    icon: PeopleIcon,
    path: "/users",
    permission: "user.read",
    component: React.lazy(() => import("./pages/users/UsersList")),
    routes: [
      {
        path: "new",
        component: React.lazy(() => import("./pages/users/UserAddEdit/UserForm")),
        permission: "user.create",
      },
      {
        path: ":id/edit",
        component: React.lazy(() => import("./pages/users/UserAddEdit/UserForm")),
        permission: "user.update",
      },
    ],
  },
  {
    label: "Roles",
    icon: SettingsIcon,
    path: "/roles",
    permission: "role.read",
    component: React.lazy(() => import("./pages/roles/RolesList")),
    routes: [
      {
        path: "new",
        component: React.lazy(() => import("./pages/roles/RoleForm")),
        permission: "role.create",
      },
      {
        path: ":id/edit",
        component: React.lazy(() => import("./pages/roles/RoleForm")),
        permission: "role.update",
      },
    ],
  },
  {
    label: "Departments",
    icon: CategoryIcon,
    path: "/departments",
    permission: "department.read",
    component: React.lazy(() => import("./pages/departments/DepartmentsList")),
    routes: [
      {
        path: "new",
        component: React.lazy(() => import("./pages/departments/DepartmentForm")),
        permission: "department.create",
      },
      {
        path: ":id/edit",
        component: React.lazy(() => import("./pages/departments/DepartmentForm")),
        permission: "department.update",
      },
    ],
  },
  {
    label: "Tags",
    icon: LabelIcon,
    path: "/tags",
    permission: "tag.read",
    component: React.lazy(() => import("./pages/tags/TagsList")),
    routes: [
      {
        path: "new",
        component: React.lazy(() => import("./pages/tags/TagForm")),
        permission: "tag.create",
      },
      {
        path: ":id/edit",
        component: React.lazy(() => import("./pages/tags/TagForm")),
        permission: "tag.update",
      },
    ],
  },
  {
    label: "Tickets",
    icon: SummarizeIcon,
    path: "/tickets",
    permission: "ticket.read",
    component: React.lazy(() => import("./pages/tickets/TicketsList")),
    routes: [
      {
        path: "new",
        component: React.lazy(() => import("./pages/tickets/TicketForm")),
        permission: "ticket.create",
      },
      {
        path: ":id",
        component: React.lazy(() => import("./pages/tickets/TicketView")),
        permission: "ticket.read",
      },
      {
        path: ":ticketId/replies",
        component: React.lazy(() => import("./pages/tickets/TicketReplies")),
        permission: "ticket.read",
      },
    ],
  },
  // {
  //   label: "Workers",
  //   icon: WorkIcon,
  //   path: "/workers",
  //   component: React.lazy(() => import("./pages/workers/Workers")),
  //   permission: "worker.read",
  // },
  // {
  //   label: "Analytics",
  //   path: "/analytics",
  //   component: React.lazy(() => import("./pages/analytics/Analytics")),
  //   permission: "analytics.read",
  // },
  // {
  //   label: "Audit",
  //   path: "/audit",
  //   component: React.lazy(() => import("./pages/audit/AuditList")),
  //   permission: "audit.read",
  // },
   {
    label: "Companies",
    icon: Business,
    path: "/companies",
    permission: "saas.company_read",
    component: React.lazy(() => import("./pages/saas/company/CompanyList")),
    routes: [
      {
        path: "new",
        component: React.lazy(() => import("./pages/saas/company/CompanyFormStepper")),
        permission: "saas.company_create",
      },
      {
        path: ":id/edit",
        component: React.lazy(() => import("./pages/saas/company/CompanyFormStepper")),
        permission: "saas.company_update",
      },
      {
        path: ":companyId/view",
        component: React.lazy(() => import("./pages/saas/company/CompanyView")),
        permission: "saas.company_read",
      },
      {
        path: ":id",
        component: React.lazy(() => import("./pages/saas/company/CompanyView")),
        permission: "saas.company_read",
      },
    ],
  },
  {
  label: "Coupons",
  icon: LocalOffer,
  path: "/coupons",
  permission: "saas.coupon_read", // Top-level permission for viewing list
  component: React.lazy(() => import("./pages/saas/coupon/CouponList")),
  routes: [
    {
      path: "new",
      component: React.lazy(() => import("./pages/saas/coupon/CouponForm")),
      permission: "saas.coupon_create",
    },
    {
      path: ":id/edit",
      component: React.lazy(() => import("./pages/saas/coupon/CouponForm")),
      permission: "saas.coupon_update",
    },
    {
      path: ":id",
      component: React.lazy(() => import("./pages/saas/coupon/CouponForm")), // You can change this to a View component if needed
      permission: "saas.coupon_read",
    },
  ],
},
// {
//   label: "Modules",
//   icon: Business, // replace with an appropriate MUI icon like `Extension`
//   path: "/modules",
//   permission: "saas.module_read",
//   component: React.lazy(() => import("./pages/saas/module/ModuleList")),
//   routes: [
//     {
//       path: "new",
//       component: React.lazy(() => import("./pages/saas/module/ModuleForm")),
//       permission: "saas.module_create",
//     },
//     {
//       path: ":id/edit",
//       component: React.lazy(() => import("./pages/saas/module/ModuleForm")),
//       permission: "saas.module_update",
//     },
//     {
//       path: ":id",
//       component: React.lazy(() => import("./pages/saas/module/ModuleForm")),
//       permission: "saas.module_read", // You can replace this with a View component if needed
//     },
//   ],
// }


];

export default routesConfig;
