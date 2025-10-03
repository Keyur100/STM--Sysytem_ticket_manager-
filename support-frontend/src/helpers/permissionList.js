export const superAdminPermissions = [
  "auth.register","auth.login","auth.refresh","auth.logout",
  "user.create","user.read","user.update","user.delete",
  "role.create","role.read","role.update","role.delete",
  "department.create","department.read","department.update","department.delete",
  "ticket.create","ticket.department_read","ticket.read","ticket.update","ticket.delete","ticket.assign","ticket.escalate","ticket.merge","ticket.child","ticket.status.change",
  "reply.create","reply.read","reply.update","reply.delete",
  "worker.register","worker.read","worker.update","worker.delete","worker.heartbeat","job.read","job.requeue",
  "audit.read","audit.export","analytics.read","analytics.export",
  "tag.create","tag.read","tag.update","tag.delete","status.create","status.read","status.update","status.delete","settings.read","settings.update","monitoring.read","monitoring.manage",
  "ticket.reopen","ticket.department_read","user.self_read","user.reset_password","user.self_update",

  // SaaS specific permissions
  
  
  "saas.user_dashboard_show", "saas.user_dashboard_filter", "saas.user_dashboard_data",
  "saas.client_dashboard_show", "saas.client_dashboard_filter", "saas.client_dashboard_data",
  "saas.task_dashboard_show", "saas.task_dashboard_filter", "saas.task_dashboard_data",
  "saas.financial_dashboard_show", "saas.financial_dashboard_filter", "saas.financial_dashboard_data",
  "saas.product_dashboard_show", "saas.product_dashboard_filter", "saas.product_dashboard_data",

  "saas.user_list", "saas.user_show", "saas.user_add", "saas.user_edit", "saas.user_delete",
  "saas.user_status", "saas.user_change_password", "saas.user_activity_log",
  "saas.employee_list", "saas.employee_show", "saas.employee_add", "saas.employee_edit", "saas.employee_delete",
  "saas.employee_status", "saas.employee_change_password",

  "saas.supplier_list", "saas.supplier_show", "saas.supplier_add", "saas.supplier_edit", "saas.supplier_delete",
  "saas.supplier_status", "saas.supplier_change_password",
  "saas.customer_list", "saas.customer_show", "saas.customer_add", "saas.customer_edit", "saas.customer_delete",
  "saas.customer_status", "saas.customer_change_password",

  "saas.role_list", "saas.role_show", "saas.role_add", "saas.role_edit", "saas.role_delete", "saas.role_status",
  "saas.department_list", "saas.department_show", "saas.department_add", "saas.department_edit",
  "saas.department_delete", "saas.department_status",
  "saas.permission_list", "saas.permission_assign",

  "saas.account_group_list", "saas.account_group_show", "saas.account_group_add", "saas.account_group_edit",
  "saas.account_group_delete", "saas.account_group_status",
  "saas.account_list", "saas.account_filter", "saas.account_show", "saas.account_add", "saas.account_edit",
  "saas.account_delete", "saas.account_status",

  "saas.customer_ledger_show", "saas.supplier_ledger_show", "saas.bank_ledger_show", "saas.employee_ledger_show",
  "saas.ledger_print", "saas.ledger_filter", "saas.ledger_passbook",
  "saas.account_approve", "saas.account_block", "saas.account_login_allow", "saas.account_opening_balance",

  "saas.product_list", "saas.product_show", "saas.product_add", "saas.product_edit", "saas.product_status",
  "saas.product_delete", "saas.product_gallery", "saas.product_stock_status", "saas.product_stock_update",
  "saas.product_price_update",

  "saas.category_list", "saas.category_show", "saas.category_add", "saas.category_edit", "saas.category_status",
  "saas.category_delete", "saas.parent_category_list", "saas.parent_category_show", "saas.parent_category_add",
  "saas.parent_category_edit", "saas.parent_category_status", "saas.parent_category_delete",

  "saas.material_list", "saas.material_show", "saas.material_add", "saas.material_edit", "saas.material_status",
  "saas.material_delete", "saas.size_list", "saas.size_show", "saas.size_add", "saas.size_edit", "saas.size_status",
  "saas.size_delete",

  "saas.pair_list", "saas.pair_show", "saas.pair_add", "saas.pair_edit", "saas.pair_status", "saas.pair_delete",
  "saas.color_list", "saas.color_show", "saas.color_add", "saas.color_edit", "saas.color_status", "saas.color_delete",

  "saas.gst_list", "saas.gst_show", "saas.gst_add", "saas.gst_edit", "saas.gst_status", "saas.gst_delete",
  "saas.discount_offer_list", "saas.discount_offer_show", "saas.discount_offer_add", "saas.discount_offer_edit",
  "saas.discount_offer_status", "saas.discount_offer_delete",

  "saas.gift_list", "saas.gift_show", "saas.gift_add", "saas.gift_edit", "saas.gift_status", "saas.gift_delete",
  "saas.main_catalogue", "saas.offer_catalogue", "saas.upcoming_catalogue", "saas.latest_catalogue",
  "saas.client_catalogue", "saas.search_catalogue", "saas.unused_catalogue", "saas.trending_catalogue",

  "saas.cart_activate", "saas.cart_list", "saas.cart_show", "saas.cart_filter", "saas.customer_cart",
  "saas.supplier_cart", "saas.client_cart", "saas.cart_print", "saas.cart_ready", "saas.cart_notready",
  "saas.cart_fulfill", "saas.cart_convert_inquiry", "saas.cart_convert_order", "saas.cart_notes_update",
  "saas.cart_item_delete", "saas.cart_item_update", "saas.cart_sales",

  "saas.newlead_list", "saas.newlead_show", "saas.newlead_add", "saas.newlead_edit", "saas.newlead_print",
  "saas.newlead_convert_inquiry", "saas.newlead_delete",

  "saas.saleinquiry_list", "saas.saleinquiry_filter", "saas.saleinquiry_show", "saas.saleinquiry_add",
  "saas.saleinquiry_edit", "saas.saleinquiry_print", "saas.saleinquiry_delete", "saas.saleinquiry_assign",
  "saas.saleinquiry_updatenotes", "saas.saleinquiry_ready_item", "saas.saleinquiry_notready_item",
  "saas.saleinquiry_cancel", "saas.saleinquiry_saleorder_convert",

  "saas.supplier_request_list", "saas.supplier_request_show", "saas.supplier_request_convert",
  "saas.supplier_request_approve", "saas.supplier_request_reject", "saas.supplier_request_print",

  "saas.customer_request_list", "saas.customer_request_show", "saas.customer_request_convert",
  "saas.customer_request_approve", "saas.customer_request_reject", "saas.customer_request_print",

  "saas.saleorder_list", "saas.saleorder_filter", "saas.saleorder_show", "saas.saleorder_add", "saas.saleorder_edit",
  "saas.saleorder_print", "saas.saleorder_print_image", "saas.saleorder_to_dispatch", "saas.saleorder_cancel",
  "saas.saleorder_delete", "saas.saleorder_manual_clear",

  "saas.dispatch_list", "saas.dispatch_filter", "saas.dispatch_show", "saas.dispatch_add", "saas.dispatch_edit",
  "saas.dispatch_print", "saas.dispatch_print_slip", "saas.dispatch_notes", "saas.dispatch_cancel",
  "saas.dispatch_delete", "saas.dispatch_hold", "saas.dispatch_pick", "saas.dispatch_unpick", "saas.dispatch_complete",
  "saas.dispatch_imcomplete", "saas.dispatch_verify_unverify", "saas.dispatch_transport_update",

  "saas.salebill_list", "saas.salebill_filter", "saas.salebill_show", "saas.salebill_add", "saas.salebill_edit",
  "saas.salebill_print", "saas.salebill_print_image", "saas.salebill_print_slip", "saas.salebill_cancel",
  "saas.salebill_delete",

  "saas.salereturn_list", "saas.salereturn_filter", "saas.salereturn_show", "saas.salereturn_add",
  "saas.salereturn_edit", "saas.salereturn_print", "saas.salereturn_print_image", "saas.salereturn_cancel",
  "saas.salereturn_delete",

  "saas.purchaseorder_list", "saas.purchaseorder_filter", "saas.purchaseorder_show", "saas.purchaseorder_add",
  "saas.purchaseorder_edit", "saas.purchaseorder_print", "saas.purchaseorder_print_image",
  "saas.purchaseorder_to_purchasebill", "saas.purchaseorder_cancel", "saas.purchaseorder_delete",
  "saas.purchaseorder_manual_clear",

  "saas.purchasebill_list", "saas.purchasebill_filter", "saas.purchasebill_show", "saas.purchasebill_add",
  "saas.purchasebill_edit", "saas.purchasebill_print", "saas.purchasebill_print_image", "saas.purchasebill_approve",
  "saas.purchasebill_cancel", "saas.purchasebill_delete",

  "saas.purchasereturn_list", "saas.purchasereturn_filter", "saas.purchasereturn_show",
  "saas.purchasereturn_add", "saas.purchasereturn_edit", "saas.purchasereturn_print",
  "saas.purchasereturn_print_image", "saas.purchasereturn_cancel", "saas.purchasereturn_delete",

  "saas.stockadjustment_list", "saas.stockadjustment_show", "saas.stockadjustment_add", "saas.stockadjustment_edit",
  "saas.stockadjustment_print", "saas.stockadjustment_cancel", "saas.stockadjustment_delete",

  "saas.qrcode_generate", "saas.qrcode_print", "saas.qrcode_delete",

  "saas.payinward_list", "saas.payinward_filter", "saas.payinward_show", "saas.payinward_add",
  "saas.payinward_edit", "saas.payinward_print", "saas.payinward_delete", "saas.payinward_history",
  "saas.payinward_billadjustment",

  "saas.payoutward_list", "saas.payoutward_filter", "saas.payoutward_show", "saas.payoutward_add",
  "saas.payoutward_edit", "saas.payoutward_print", "saas.payoutward_delete", "saas.payoutward_history",
  "saas.payoutward_billadjustment",

  "saas.transfer_list", "saas.transfer_filter", "saas.transfer_show", "saas.transfer_add", "saas.transfer_edit",
  "saas.transfer_print", "saas.transfer_delete", "saas.transfer_history", "saas.transfer_billadjustment",

  "saas.plan_create", "saas.plan_read", "saas.plan_update", "saas.plan_delete",
  "saas.subscription_buy", "saas.subscription_read", "saas.subscription_update", "saas.subscription_cancel",
  "saas.subscription_upgrade", "saas.subscription_schedule_downgrade",

  "saas.addon_create", "saas.addon_read", "saas.addon_update", "saas.addon_delete", "saas.addon_buy",

  "saas.order_read", "saas.order_create", "saas.order_update",

  "saas.payment_approve", "saas.payment_refund", "saas.payment_read",

  "saas.wallet_topup", "saas.wallet_read", "saas.wallet_manage",

  "saas.cart_read", "saas.cart_update", "saas.cart_checkout",

  "saas.coupon_create", "saas.coupon_apply", "saas.coupon_read",

  "saas.billing_view", "saas.billing_manage",

  "saas.proration_manage",

  "saas.usage_view", "saas.usage_enforce",

  "saas.quota_update",

  "saas.worker_manage", "saas.worker_scale",

  "saas.job_read", "saas.job_requeue",

  "saas.audit_read", "saas.audit_write",

  "saas.notification_manage",

  "saas.module_create", "saas.module_read", "saas.module_update", "saas.module_delete",

  "saas.company_create", "saas.company_read", "saas.company_update", "saas.company_delete", "saas.company_manage"
]

// add every time when new module permisiion added 
  

