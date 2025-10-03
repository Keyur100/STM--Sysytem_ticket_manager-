// right now in front and back both side maintining permiison support-frontend\src\helpers\permissionList.js so when add new permission add those in front also manual
const planExclusions = require("./planExclusions");
const allModules=[
  {
    "group": "Dashboard",
    "moduleKey": "dashboard",
    "displayName": "Dashboard",
    "actions": [
      { "key": "saas.user_dashboard_show", "label": "User Dashboard Show" },
      { "key": "saas.user_dashboard_filter", "label": "User Dashboard Filter" },
      { "key": "saas.user_dashboard_data", "label": "User Dashboard Data" },
      { "key": "saas.client_dashboard_show", "label": "Client Dashboard Show" },
      { "key": "saas.client_dashboard_filter", "label": "Client Dashboard Filter" },
      { "key": "saas.client_dashboard_data", "label": "Client Dashboard Data" },
      { "key": "saas.task_dashboard_show", "label": "Task Dashboard Show" },
      { "key": "saas.task_dashboard_filter", "label": "Task Dashboard Filter" },
      { "key": "saas.task_dashboard_data", "label": "Task Dashboard Data" },
      { "key": "saas.financial_dashboard_show", "label": "Financial Dashboard Show" },
      { "key": "saas.financial_dashboard_filter", "label": "Financial Dashboard Filter" },
      { "key": "saas.financial_dashboard_data", "label": "Financial Dashboard Data" },
      { "key": "saas.product_dashboard_show", "label": "Product Dashboard Show" },
      { "key": "saas.product_dashboard_filter", "label": "Product Dashboard Filter" },
      { "key": "saas.product_dashboard_data", "label": "Product Dashboard Data" }
    ]
  },
  {
    "group": "Users",
    "moduleKey": "user",
    "displayName": "User Management",
    "actions": [
      { "key": "saas.user_list", "label": "List Users" },
      { "key": "saas.user_show", "label": "View User" },
      { "key": "saas.user_add", "label": "Add User" },
      { "key": "saas.user_edit", "label": "Edit User" },
      { "key": "saas.user_delete", "label": "Delete User" },
      { "key": "saas.user_status", "label": "Change User Status" },
      { "key": "saas.user_change_password", "label": "Change User Password" },
      { "key": "saas.user_activity_log", "label": "User Activity Log" }
    ]
  },
  {
    "group": "Users",
    "moduleKey": "employee",
    "displayName": "Employee Management",
    "actions": [
      { "key": "saas.employee_list", "label": "List Employees" },
      { "key": "saas.employee_show", "label": "View Employee" },
      { "key": "saas.employee_add", "label": "Add Employee" },
      { "key": "saas.employee_edit", "label": "Edit Employee" },
      { "key": "saas.employee_delete", "label": "Delete Employee" },
      { "key": "saas.employee_status", "label": "Change Employee Status" },
      { "key": "saas.employee_change_password", "label": "Change Employee Password" }
    ]
  },
  {
    "group": "Users",
    "moduleKey": "supplier",
    "displayName": "Supplier Management",
    "actions": [
      { "key": "saas.supplier_list", "label": "List Suppliers" },
      { "key": "saas.supplier_show", "label": "View Supplier" },
      { "key": "saas.supplier_add", "label": "Add Supplier" },
      { "key": "saas.supplier_edit", "label": "Edit Supplier" },
      { "key": "saas.supplier_delete", "label": "Delete Supplier" },
      { "key": "saas.supplier_status", "label": "Change Supplier Status" },
      { "key": "saas.supplier_change_password", "label": "Change Supplier Password" }
    ]
  },
  {
    "group": "Users",
    "moduleKey": "customer",
    "displayName": "Customer Management",
    "actions": [
      { "key": "saas.customer_list", "label": "List Customers" },
      { "key": "saas.customer_show", "label": "View Customer" },
      { "key": "saas.customer_add", "label": "Add Customer" },
      { "key": "saas.customer_edit", "label": "Edit Customer" },
      { "key": "saas.customer_delete", "label": "Delete Customer" },
      { "key": "saas.customer_status", "label": "Change Customer Status" },
      { "key": "saas.customer_change_password", "label": "Change Customer Password" }
    ]
  },
  {
    "group": "Users",
    "moduleKey": "role",
    "displayName": "Role Management",
    "actions": [
      { "key": "saas.role_list", "label": "List Roles" },
      { "key": "saas.role_show", "label": "View Role" },
      { "key": "saas.role_add", "label": "Add Role" },
      { "key": "saas.role_edit", "label": "Edit Role" },
      { "key": "saas.role_delete", "label": "Delete Role" },
      { "key": "saas.role_status", "label": "Change Role Status" }
    ]
  },
  {
    "group": "Users",
    "moduleKey": "department",
    "displayName": "Department Management",
    "actions": [
      { "key": "saas.department_list", "label": "List Departments" },
      { "key": "saas.department_show", "label": "View Department" },
      { "key": "saas.department_add", "label": "Add Department" },
      { "key": "saas.department_edit", "label": "Edit Department" },
      { "key": "saas.department_delete", "label": "Delete Department" },
      { "key": "saas.department_status", "label": "Change Department Status" }
    ]
  },
  {
    "group": "Users",
    "moduleKey": "permission",
    "displayName": "Permission Management",
    "actions": [
      { "key": "saas.permission_list", "label": "List Permissions" },
      { "key": "saas.permission_assign", "label": "Assign Permission" }
    ]
  },
  {
    "group": "Account",
    "moduleKey": "account_group",
    "displayName": "Account Group",
    "actions": [
      { "key": "saas.account_group_list", "label": "List Account Groups" },
      { "key": "saas.account_group_show", "label": "View Account Group" },
      { "key": "saas.account_group_add", "label": "Add Account Group" },
      { "key": "saas.account_group_edit", "label": "Edit Account Group" },
      { "key": "saas.account_group_delete", "label": "Delete Account Group" },
      { "key": "saas.account_group_status", "label": "Change Account Group Status" }
    ]
  },
  {
    "group": "Account",
    "moduleKey": "account",
    "displayName": "Account",
    "actions": [
      { "key": "saas.account_list", "label": "List Accounts" },
      { "key": "saas.account_filter", "label": "Filter Accounts" },
      { "key": "saas.account_show", "label": "View Account" },
      { "key": "saas.account_add", "label": "Add Account" },
      { "key": "saas.account_edit", "label": "Edit Account" },
      { "key": "saas.account_delete", "label": "Delete Account" },
      { "key": "saas.account_status", "label": "Change Account Status" }
    ]
  },
  {
    "group": "Account",
    "moduleKey": "account_ledger",
    "displayName": "Account Ledger",
    "actions": [
      { "key": "saas.customer_ledger_show", "label": "Customer Ledger Show" },
      { "key": "saas.supplier_ledger_show", "label": "Supplier Ledger Show" },
      { "key": "saas.bank_ledger_show", "label": "Bank Ledger Show" },
      { "key": "saas.employee_ledger_show", "label": "Employee Ledger Show" },
      { "key": "saas.ledger_print", "label": "Ledger Print" },
      { "key": "saas.ledger_filter", "label": "Ledger Filter" },
      { "key": "saas.ledger_passbook", "label": "Ledger Passbook" }
    ]
  },
  {
    "group": "Account",
    "moduleKey": "account_action",
    "displayName": "Account Actions",
    "actions": [
      { "key": "saas.account_approve", "label": "Account Approve" },
      { "key": "saas.account_block", "label": "Account Block" },
      { "key": "saas.account_login_allow", "label": "Account Login Allow" },
      { "key": "saas.account_opening_balance", "label": "Account Opening Balance" }
    ]
  },
// 
  {
    "group": "Product",
    "moduleKey": "product",
    "displayName": "Product",
    "actions": [
      { "key": "saas.product_list", "label": "List Products" },
      { "key": "saas.product_show", "label": "View Product" },
      { "key": "saas.product_add", "label": "Add Product" },
      { "key": "saas.product_edit", "label": "Edit Product" },
      { "key": "saas.product_status", "label": "Change Product Status" },
      { "key": "saas.product_delete", "label": "Delete Product" },
      { "key": "saas.product_gallery", "label": "Product Gallery" },
      { "key": "saas.product_stock_status", "label": "Product Stock Status" },
      { "key": "saas.product_stock_update", "label": "Product Stock Update" },
      { "key": "saas.product_price_update", "label": "Product Price Update" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "category",
    "displayName": "Category",
    "actions": [
      { "key": "saas.category_list", "label": "List Categories" },
      { "key": "saas.category_show", "label": "View Category" },
      { "key": "saas.category_add", "label": "Add Category" },
      { "key": "saas.category_edit", "label": "Edit Category" },
      { "key": "saas.category_status", "label": "Change Category Status" },
      { "key": "saas.category_delete", "label": "Delete Category" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "parent_category",
    "displayName": "Parent Category",
    "actions": [
      { "key": "saas.parent_category_list", "label": "List Parent Categories" },
      { "key": "saas.parent_category_show", "label": "View Parent Category" },
      { "key": "saas.parent_category_add", "label": "Add Parent Category" },
      { "key": "saas.parent_category_edit", "label": "Edit Parent Category" },
      { "key": "saas.parent_category_status", "label": "Change Parent Category Status" },
      { "key": "saas.parent_category_delete", "label": "Delete Parent Category" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "material",
    "displayName": "Material",
    "actions": [
      { "key": "saas.material_list", "label": "List Materials" },
      { "key": "saas.material_show", "label": "View Material" },
      { "key": "saas.material_add", "label": "Add Material" },
      { "key": "saas.material_edit", "label": "Edit Material" },
      { "key": "saas.material_status", "label": "Change Material Status" },
      { "key": "saas.material_delete", "label": "Delete Material" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "size",
    "displayName": "Size",
    "actions": [
      { "key": "saas.size_list", "label": "List Sizes" },
      { "key": "saas.size_show", "label": "View Size" },
      { "key": "saas.size_add", "label": "Add Size" },
      { "key": "saas.size_edit", "label": "Edit Size" },
      { "key": "saas.size_status", "label": "Change Size Status" },
      { "key": "saas.size_delete", "label": "Delete Size" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "pair",
    "displayName": "Pair",
    "actions": [
      { "key": "saas.pair_list", "label": "List Pairs" },
      { "key": "saas.pair_show", "label": "View Pair" },
      { "key": "saas.pair_add", "label": "Add Pair" },
      { "key": "saas.pair_edit", "label": "Edit Pair" },
      { "key": "saas.pair_status", "label": "Change Pair Status" },
      { "key": "saas.pair_delete", "label": "Delete Pair" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "color",
    "displayName": "Color",
    "actions": [
      { "key": "saas.color_list", "label": "List Colors" },
      { "key": "saas.color_show", "label": "View Color" },
      { "key": "saas.color_add", "label": "Add Color" },
      { "key": "saas.color_edit", "label": "Edit Color" },
      { "key": "saas.color_status", "label": "Change Color Status" },
      { "key": "saas.color_delete", "label": "Delete Color" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "gst",
    "displayName": "GST",
    "actions": [
      { "key": "saas.gst_list", "label": "List GSTs" },
      { "key": "saas.gst_show", "label": "View GST" },
      { "key": "saas.gst_add", "label": "Add GST" },
      { "key": "saas.gst_edit", "label": "Edit GST" },
      { "key": "saas.gst_status", "label": "Change GST Status" },
      { "key": "saas.gst_delete", "label": "Delete GST" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "discount_offer",
    "displayName": "Discount Offer",
    "actions": [
      { "key": "saas.discount_offer_list", "label": "List Discount Offers" },
      { "key": "saas.discount_offer_show", "label": "View Discount Offer" },
      { "key": "saas.discount_offer_add", "label": "Add Discount Offer" },
      { "key": "saas.discount_offer_edit", "label": "Edit Discount Offer" },
      { "key": "saas.discount_offer_status", "label": "Change Discount Offer Status" },
      { "key": "saas.discount_offer_delete", "label": "Delete Discount Offer" }
    ]
  },
  {
    "group": "Product",
    "moduleKey": "gift",
    "displayName": "Gift",
    "actions": [
      { "key": "saas.gift_list", "label": "List Gifts" },
      { "key": "saas.gift_show", "label": "View Gift" },
      { "key": "saas.gift_add", "label": "Add Gift" },
      { "key": "saas.gift_edit", "label": "Edit Gift" },
      { "key": "saas.gift_status", "label": "Change Gift Status" },
      { "key": "saas.gift_delete", "label": "Delete Gift" }
    ]
  },
  {
    "group": "Catalogue",
    "moduleKey": "catalogue",
    "displayName": "Catalogue",
    "actions": [
      { "key": "saas.main_catalogue", "label": "Main Catalogue" },
      { "key": "saas.offer_catalogue", "label": "Offer Catalogue" },
      { "key": "saas.upcoming_catalogue", "label": "Upcoming Catalogue" },
      { "key": "saas.latest_catalogue", "label": "Latest Catalogue" },
      { "key": "saas.client_catalogue", "label": "Client Catalogue" },
      { "key": "saas.search_catalogue", "label": "Search Catalogue" },
      { "key": "saas.unused_catalogue", "label": "Unused Catalogue" },
      { "key": "saas.trending_catalogue", "label": "Trending Catalogue" }
    ]
  },
  {
    "group": "Cart",
    "moduleKey": "cart",
    "displayName": "Cart",
    "actions": [
      { "key": "saas.cart_activate", "label": "Activate Cart" },
      { "key": "saas.cart_list", "label": "List Carts" },
      { "key": "saas.cart_show", "label": "View Cart" },
      { "key": "saas.cart_filter", "label": "Filter Cart" },
      { "key": "saas.customer_cart", "label": "Customer Cart" },
      { "key": "saas.supplier_cart", "label": "Supplier Cart" },
      { "key": "saas.client_cart", "label": "Client Cart" },
      { "key": "saas.cart_print", "label": "Print Cart" },
      { "key": "saas.cart_ready", "label": "Cart Ready" },
      { "key": "saas.cart_notready", "label": "Cart Not Ready" },
      { "key": "saas.cart_fulfill", "label": "Fulfill Cart" },
      { "key": "saas.cart_convert_inquiry", "label": "Convert Cart to Inquiry" },
      { "key": "saas.cart_convert_order", "label": "Convert Cart to Sale Order" },
      { "key": "saas.cart_notes_update", "label": "Update Cart Notes" },
      { "key": "saas.cart_item_delete", "label": "Delete Cart Item" },
      { "key": "saas.cart_item_update", "label": "Update Cart Item" },
      { "key": "saas.cart_sales", "label": "Cart Sales" }
    ]
  },
// 

  {
    "group": "Inquiry/Lead",
    "moduleKey": "newlead",
    "displayName": "New Lead",
    "actions": [
      { "key": "saas.newlead_list", "label": "List New Leads" },
      { "key": "saas.newlead_show", "label": "View New Lead" },
      { "key": "saas.newlead_add", "label": "Add New Lead" },
      { "key": "saas.newlead_edit", "label": "Edit New Lead" },
      { "key": "saas.newlead_print", "label": "Print New Lead" },
      { "key": "saas.newlead_convert_inquiry", "label": "Convert New Lead to Inquiry" },
      { "key": "saas.newlead_delete", "label": "Delete New Lead" }
    ]
  },
  {
    "group": "Inquiry/Lead",
    "moduleKey": "sale_inquiry",
    "displayName": "Sale Inquiry",
    "actions": [
      { "key": "saas.saleinquiry_list", "label": "List Sale Inquiries" },
      { "key": "saas.saleinquiry_filter", "label": "Filter Sale Inquiries" },
      { "key": "saas.saleinquiry_show", "label": "View Sale Inquiry" },
      { "key": "saas.saleinquiry_add", "label": "Add Sale Inquiry" },
      { "key": "saas.saleinquiry_edit", "label": "Edit Sale Inquiry" },
      { "key": "saas.saleinquiry_print", "label": "Print Sale Inquiry" },
      { "key": "saas.saleinquiry_delete", "label": "Delete Sale Inquiry" },
      { "key": "saas.saleinquiry_assign", "label": "Assign Sale Inquiry" },
      { "key": "saas.saleinquiry_updatenotes", "label": "Update Sale Inquiry Notes" },
      { "key": "saas.saleinquiry_ready_item", "label": "Mark Items Ready" },
      { "key": "saas.saleinquiry_notready_item", "label": "Mark Items Not Ready" },
      { "key": "saas.saleinquiry_cancel", "label": "Cancel Sale Inquiry" },
      { "key": "saas.saleinquiry_saleorder_convert", "label": "Convert Sale Inquiry to Sale Order" }
    ]
  },
  {
    "group": "Client Request",
    "moduleKey": "supplier_request",
    "displayName": "Supplier Request",
    "actions": [
      { "key": "saas.supplier_request_list", "label": "List Supplier Requests" },
      { "key": "saas.supplier_request_show", "label": "View Supplier Request" },
      { "key": "saas.supplier_request_convert", "label": "Convert Supplier Request" },
      { "key": "saas.supplier_request_approve", "label": "Approve Supplier Request" },
      { "key": "saas.supplier_request_reject", "label": "Reject Supplier Request" },
      { "key": "saas.supplier_request_print", "label": "Print Supplier Request" }
    ]
  },
  {
    "group": "Client Request",
    "moduleKey": "customer_request",
    "displayName": "Customer Request",
    "actions": [
      { "key": "saas.customer_request_list", "label": "List Customer Requests" },
      { "key": "saas.customer_request_show", "label": "View Customer Request" },
      { "key": "saas.customer_request_convert", "label": "Convert Customer Request" },
      { "key": "saas.customer_request_approve", "label": "Approve Customer Request" },
      { "key": "saas.customer_request_reject", "label": "Reject Customer Request" },
      { "key": "saas.customer_request_print", "label": "Print Customer Request" }
    ]
  },
  {
    "group": "Sales",
    "moduleKey": "sale_order",
    "displayName": "Sale Order",
    "actions": [
      { "key": "saas.saleorder_list", "label": "List Sale Orders" },
      { "key": "saas.saleorder_filter", "label": "Filter Sale Orders" },
      { "key": "saas.saleorder_show", "label": "View Sale Order" },
      { "key": "saas.saleorder_add", "label": "Add Sale Order" },
      { "key": "saas.saleorder_edit", "label": "Edit Sale Order" },
      { "key": "saas.saleorder_print", "label": "Print Sale Order" },
      { "key": "saas.saleorder_print_image", "label": "Print Sale Order Image" },
      { "key": "saas.saleorder_to_dispatch", "label": "Send Sale Order to Dispatch" },
      { "key": "saas.saleorder_cancel", "label": "Cancel Sale Order" },
      { "key": "saas.saleorder_delete", "label": "Delete Sale Order" },
      { "key": "saas.saleorder_manual_clear", "label": "Manual Clear Sale Order" }
    ]
  },
  {
    "group": "Sales",
    "moduleKey": "dispatch",
    "displayName": "Dispatch",
    "actions": [
      { "key": "saas.dispatch_list", "label": "List Dispatches" },
      { "key": "saas.dispatch_filter", "label": "Filter Dispatches" },
      { "key": "saas.dispatch_show", "label": "View Dispatch" },
      { "key": "saas.dispatch_add", "label": "Add Dispatch" },
      { "key": "saas.dispatch_edit", "label": "Edit Dispatch" },
      { "key": "saas.dispatch_print", "label": "Print Dispatch" },
      { "key": "saas.dispatch_print_slip", "label": "Print Dispatch Slip" },
      { "key": "saas.dispatch_notes", "label": "Update Dispatch Notes" },
      { "key": "saas.dispatch_cancel", "label": "Cancel Dispatch" },
      { "key": "saas.dispatch_delete", "label": "Delete Dispatch" },
      { "key": "saas.dispatch_hold", "label": "Hold Dispatch" },
      { "key": "saas.dispatch_pick", "label": "Pick Dispatch" },
      { "key": "saas.dispatch_unpick", "label": "Unpick Dispatch" },
      { "key": "saas.dispatch_complete", "label": "Complete Dispatch" },
      { "key": "saas.dispatch_imcomplete", "label": "Mark Dispatch Incomplete" },
      { "key": "saas.dispatch_verify_unverify", "label": "Verify/Unverify Dispatch" },
      { "key": "saas.dispatch_transport_update", "label": "Update Dispatch Transport" }
    ]
  },
  {
    "group": "Sales",
    "moduleKey": "sale_bill",
    "displayName": "Sale Bill",
    "actions": [
      { "key": "saas.salebill_list", "label": "List Sale Bills" },
      { "key": "saas.salebill_filter", "label": "Filter Sale Bills" },
      { "key": "saas.salebill_show", "label": "View Sale Bill" },
      { "key": "saas.salebill_add", "label": "Add Sale Bill" },
      { "key": "saas.salebill_edit", "label": "Edit Sale Bill" },
      { "key": "saas.salebill_print", "label": "Print Sale Bill" },
      { "key": "saas.salebill_print_image", "label": "Print Sale Bill Image" },
      { "key": "saas.salebill_print_slip", "label": "Print Sale Bill Slip" },
      { "key": "saas.salebill_cancel", "label": "Cancel Sale Bill" },
      { "key": "saas.salebill_delete", "label": "Delete Sale Bill" }
    ]
  },
  {
    "group": "Sales",
    "moduleKey": "salereturn",
    "displayName": "Sale Return",
    "actions": [
      { "key": "saas.salereturn_list", "label": "List Sale Returns" },
      { "key": "saas.salereturn_filter", "label": "Filter Sale Returns" },
      { "key": "saas.salereturn_show", "label": "View Sale Return" },
      { "key": "saas.salereturn_add", "label": "Add Sale Return" },
      { "key": "saas.salereturn_edit", "label": "Edit Sale Return" },
      { "key": "saas.salereturn_print", "label": "Print Sale Return" },
      { "key": "saas.salereturn_print_image", "label": "Print Sale Return Image" },
      { "key": "saas.salereturn_cancel", "label": "Cancel Sale Return" },
      { "key": "saas.salereturn_delete", "label": "Delete Sale Return" }
    ]
  },
// 

  {
    "group": "Purchase",
    "moduleKey": "purchase_order",
    "displayName": "Purchase Order",
    "actions": [
      { "key": "saas.purchaseorder_list", "label": "List Purchase Orders" },
      { "key": "saas.purchaseorder_filter", "label": "Filter Purchase Orders" },
      { "key": "saas.purchaseorder_show", "label": "View Purchase Order" },
      { "key": "saas.purchaseorder_add", "label": "Add Purchase Order" },
      { "key": "saas.purchaseorder_edit", "label": "Edit Purchase Order" },
      { "key": "saas.purchaseorder_print", "label": "Print Purchase Order" },
      { "key": "saas.purchaseorder_print_image", "label": "Print Purchase Order Image" },
      { "key": "saas.purchaseorder_to_purchasebill", "label": "Convert to Purchase Bill" },
      { "key": "saas.purchaseorder_cancel", "label": "Cancel Purchase Order" },
      { "key": "saas.purchaseorder_delete", "label": "Delete Purchase Order" },
      { "key": "saas.purchaseorder_manual_clear", "label": "Manual Clear Purchase Order" }
    ]
  },
  {
    "group": "Purchase",
    "moduleKey": "purchase_bill",
    "displayName": "Purchase Bill",
    "actions": [
      { "key": "saas.purchasebill_list", "label": "List Purchase Bills" },
      { "key": "saas.purchasebill_filter", "label": "Filter Purchase Bills" },
      { "key": "saas.purchasebill_show", "label": "View Purchase Bill" },
      { "key": "saas.purchasebill_add", "label": "Add Purchase Bill" },
      { "key": "saas.purchasebill_edit", "label": "Edit Purchase Bill" },
      { "key": "saas.purchasebill_print", "label": "Print Purchase Bill" },
      { "key": "saas.purchasebill_print_image", "label": "Print Purchase Bill Image" },
      { "key": "saas.purchasebill_approve", "label": "Approve Purchase Bill" },
      { "key": "saas.purchasebill_cancel", "label": "Cancel Purchase Bill" },
      { "key": "saas.purchasebill_delete", "label": "Delete Purchase Bill" }
    ]
  },
  {
    "group": "Purchase",
    "moduleKey": "purchasereturn",
    "displayName": "Purchase Return",
    "actions": [
      { "key": "saas.purchasereturn_list", "label": "List Purchase Returns" },
      { "key": "saas.purchasereturn_filter", "label": "Filter Purchase Returns" },
      { "key": "saas.purchasereturn_show", "label": "View Purchase Return" },
      { "key": "saas.purchasereturn_add", "label": "Add Purchase Return" },
      { "key": "saas.purchasereturn_edit", "label": "Edit Purchase Return" },
      { "key": "saas.purchasereturn_print", "label": "Print Purchase Return" },
      { "key": "saas.purchasereturn_print_image", "label": "Print Purchase Return Image" },
      { "key": "saas.purchasereturn_cancel", "label": "Cancel Purchase Return" },
      { "key": "saas.purchasereturn_delete", "label": "Delete Purchase Return" }
    ]
  },
  {
    "group": "Stock",
    "moduleKey": "stock_adjustment",
    "displayName": "Stock Adjustment",
    "actions": [
      { "key": "saas.stockadjustment_list", "label": "List Stock Adjustments" },
      { "key": "saas.stockadjustment_show", "label": "View Stock Adjustment" },
      { "key": "saas.stockadjustment_add", "label": "Add Stock Adjustment" },
      { "key": "saas.stockadjustment_edit", "label": "Edit Stock Adjustment" },
      { "key": "saas.stockadjustment_print", "label": "Print Stock Adjustment" },
      { "key": "saas.stockadjustment_cancel", "label": "Cancel Stock Adjustment" },
      { "key": "saas.stockadjustment_delete", "label": "Delete Stock Adjustment" }
    ]
  },
  {
    "group": "QRCode",
    "moduleKey": "qrcode",
    "displayName": "QR Code",
    "actions": [
      { "key": "saas.qrcode_generate", "label": "Generate QR Code" },
      { "key": "saas.qrcode_print", "label": "Print QR Code" },
      { "key": "saas.qrcode_delete", "label": "Delete QR Code" }
    ]
  },
  {
    "group": "Payment",
    "moduleKey": "payment_inward",
    "displayName": "Payment Inward",
    "actions": [
      { "key": "saas.payinward_list", "label": "List Inward Payments" },
      { "key": "saas.payinward_filter", "label": "Filter Inward Payments" },
      { "key": "saas.payinward_show", "label": "View Inward Payment" },
      { "key": "saas.payinward_add", "label": "Add Inward Payment" },
      { "key": "saas.payinward_edit", "label": "Edit Inward Payment" },
      { "key": "saas.payinward_print", "label": "Print Inward Payment" },
      { "key": "saas.payinward_delete", "label": "Delete Inward Payment" },
      { "key": "saas.payinward_history", "label": "Inward Payment History" },
      { "key": "saas.payinward_billadjustment", "label": "Adjust Bill Inward Payment" }
    ]
  },
  {
    "group": "Payment",
    "moduleKey": "payment_outward",
    "displayName": "Payment Outward",
    "actions": [
      { "key": "saas.payoutward_list", "label": "List Outward Payments" },
      { "key": "saas.payoutward_filter", "label": "Filter Outward Payments" },
      { "key": "saas.payoutward_show", "label": "View Outward Payment" },
      { "key": "saas.payoutward_add", "label": "Add Outward Payment" },
      { "key": "saas.payoutward_edit", "label": "Edit Outward Payment" },
      { "key": "saas.payoutward_print", "label": "Print Outward Payment" },
      { "key": "saas.payoutward_delete", "label": "Delete Outward Payment" },
      { "key": "saas.payoutward_history", "label": "Outward Payment History" },
      { "key": "saas.payoutward_billadjustment", "label": "Adjust Bill Outward Payment" }
    ]
  },
  {
    "group": "Payment",
    "moduleKey": "payment_transfer",
    "displayName": "Payment Transfer",
    "actions": [
      { "key": "saas.transfer_list", "label": "List Transfers" },
      { "key": "saas.transfer_filter", "label": "Filter Transfers" },
      { "key": "saas.transfer_show", "label": "View Transfer" },
      { "key": "saas.transfer_add", "label": "Add Transfer" },
      { "key": "saas.transfer_edit", "label": "Edit Transfer" },
      { "key": "saas.transfer_print", "label": "Print Transfer" },
      { "key": "saas.transfer_delete", "label": "Delete Transfer" },
      { "key": "saas.transfer_history", "label": "Transfer History" },
      { "key": "saas.transfer_billadjustment", "label": "Adjust Bill Transfer" }
    ]
  },
// 
  {
    "group": "Plan",// not rekate to saas
    "moduleKey": "plan",
    "displayName": "Plans",
    "actions": [
      { "key": "saas.plan_create", "label": "Create Plan" },
      { "key": "saas.plan_read", "label": "Read Plan" },
      { "key": "saas.plan_update", "label": "Update Plan" },
      { "key": "saas.plan_delete", "label": "Delete Plan" }
    ]
  },
  {
    "group": "Subscription",
    "moduleKey": "subscription",
    "displayName": "Subscriptions",
    "actions": [
      { "key": "saas.subscription_buy", "label": "Buy Subscription" },
      { "key": "saas.subscription_read", "label": "Read Subscription" },
      { "key": "saas.subscription_update", "label": "Update Subscription" },
      { "key": "saas.subscription_cancel", "label": "Cancel Subscription" },
      { "key": "saas.subscription_upgrade", "label": "Upgrade Subscription" },
      { "key": "saas.subscription_schedule_downgrade", "label": "Schedule Downgrade" }
    ]
  },
  {
    "group": "Addon",
    "moduleKey": "addon",
    "displayName": "Addons",
    "actions": [
      { "key": "saas.addon_create", "label": "Create Addon" },
      { "key": "saas.addon_read", "label": "Read Addon" },
      { "key": "saas.addon_update", "label": "Update Addon" },
      { "key": "saas.addon_delete", "label": "Delete Addon" },
      { "key": "saas.addon_buy", "label": "Buy Addon" }
    ]
  },
  {
    "group": "Order",
    "moduleKey": "order",
    "displayName": "Orders",
    "actions": [
      { "key": "saas.order_read", "label": "Read Order" },
      { "key": "saas.order_create", "label": "Create Order" },
      { "key": "saas.order_update", "label": "Update Order" }
    ]
  },
  {
    "group": "Payment",
    "moduleKey": "payment",
    "displayName": "Payments",
    "actions": [
      { "key": "saas.payment_approve", "label": "Approve Payment" },
      { "key": "saas.payment_refund", "label": "Refund Payment" },
      { "key": "saas.payment_read", "label": "Read Payment" }
    ]
  },
  {
    "group": "Wallet",
    "moduleKey": "wallet",
    "displayName": "Wallet",
    "actions": [
      { "key": "saas.wallet_topup", "label": "Top Up Wallet" },
      { "key": "saas.wallet_read", "label": "Read Wallet" },
      { "key": "saas.wallet_manage", "label": "Manage Wallet" }
    ]
  },
  {
    "group": "Coupon",
    "moduleKey": "coupon",
    "displayName": "Coupons",
    "actions": [
      { "key": "saas.coupon_create", "label": "Create Coupon" },
      { "key": "saas.coupon_apply", "label": "Apply Coupon" },
      { "key": "saas.coupon_read", "label": "Read Coupon" }
    ]
  },
  {
    "group": "Billing",
    "moduleKey": "billing",
    "displayName": "Billing",
    "actions": [
      { "key": "saas.billing_view", "label": "View Billing" },
      { "key": "saas.billing_manage", "label": "Manage Billing" },
      { "key": "saas.proration_manage", "label": "Manage Proration" }
    ]
  },
  {
    "group": "Usage & Quota",
    "moduleKey": "usage_quota",
    "displayName": "Usage & Quota",
    "actions": [
      { "key": "saas.usage_view", "label": "View Usage" },
      { "key": "saas.usage_enforce", "label": "Enforce Usage" },
      { "key": "saas.quota_update", "label": "Update Quota" }
    ]
  },
  {
    "group": "Worker & Jobs",
    "moduleKey": "worker",
    "displayName": "Worker & Jobs",
    "actions": [
      { "key": "saas.worker_manage", "label": "Manage Worker" },
      { "key": "saas.worker_scale", "label": "Scale Worker" },
      { "key": "saas.job_read", "label": "Read Job" },
      { "key": "saas.job_requeue", "label": "Requeue Job" }
    ]
  },
  {
    "group": "Audit & Notification",
    "moduleKey": "audit_notification",
    "displayName": "Audit & Notification",
    "actions": [
      { "key": "saas.audit_read", "label": "Read Audit" },
      { "key": "saas.audit_write", "label": "Write Audit" },
      { "key": "saas.notification_manage", "label": "Manage Notification" }
    ]
  },
  {
  "group": "Module",// not rekate to saas
  "moduleKey": "module",
  "displayName": "Module",
  "actions": [
    { "key": "saas.module_create", "label": "Create Module" },
    { "key": "saas.module_read", "label": "Read Module" },
    { "key": "saas.module_update", "label": "Update Module" },
    { "key": "saas.module_delete", "label": "Delete Module" },
  ]
},
{
  "group": "Company",// not rekate to saas
  "moduleKey": "company",
  "displayName": "Company",
  "actions": [
    { "key": "saas.company_create", "label": "Create Company" },
    { "key": "saas.company_read", "label": "Read Company" },
    { "key": "saas.company_update", "label": "Update Company" },
    { "key": "saas.company_delete", "label": "Delete Company" },
    { "key": "saas.company_manage", "label": "Manage Company" }
  ]
}


]

module.exports = {
  allModules,

  /**
 * ✅ Builds allowed permissions per plan
 * @param {string} planName - e.g. BASIC_MONTHLY_XS, BASIC_MONTHLY_M, etc.
 * @returns {Array} - Modules with allowed actions
 */
 getPlanPermissions:(planName)=> {
  const plan = planExclusions[planName] || {};

  const { excludeModules = [], excludeActions = {} } = plan;

  return allModules
    .filter((module) => !excludeModules.includes(module.moduleKey))
    .map((module) => {
      const moduleKey = module.moduleKey;
      const excluded = excludeActions[moduleKey] || [];

      const allowedActions = module.actions.filter(
        (a) => !excluded.includes(a.key)
      );

      return {
        moduleKey,
        displayName: module.displayName,
        visible: true,
        actions: allowedActions.map((a) => ({
          key: a.key,
          visible:true
        }))
      };
    });
}
};

// const allActionKeys = allModules.flatMap(module => module.actions.map(a => a.key))

// console.log(allActionKeys); 