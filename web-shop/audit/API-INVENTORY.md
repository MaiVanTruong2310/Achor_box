# Backend API inventory (read-only source audit)


## backend\src\main\java\com\smartbox\backend\controller\admin\AdminNotificationsController.java

@GetMapping("/api/admin/notifications")

## backend\src\main\java\com\smartbox\backend\controller\admin\AdminSettingsController.java

@RequestMapping("/api/settings")
@GetMapping({"/categories", "/payment-methods", "/shipping-methods"})
@PostMapping("/categories")
@PutMapping("/categories/{id}")
@PostMapping("/payment-methods")
@PutMapping("/payment-methods/{id}")
@PostMapping("/shipping-methods")
@PutMapping("/shipping-methods/{id}")
@DeleteMapping("/{kind:categories|payment-methods|shipping-methods}/{id}")

## backend\src\main\java\com\smartbox\backend\controller\admin\AuditLogController.java

@RequestMapping("/api/audit-logs")
@GetMapping
@GetMapping("/paged")
@PostMapping

## backend\src\main\java\com\smartbox\backend\controller\admin\ConcurrentDashboardController.java

@GetMapping("/api/admin/dashboard")

## backend\src\main\java\com\smartbox\backend\controller\admin\ContentController.java

@RequestMapping("/api/content")
@GetMapping("/summary")
@GetMapping("/articles")
@GetMapping("/articles/paged")
@GetMapping("/articles/{id}")
@PostMapping("/articles")
@PutMapping("/articles/{id}")
@DeleteMapping("/articles/{id}")
@GetMapping("/banners")
@PostMapping("/banners")
@PutMapping("/banners/{id}")
@PatchMapping("/banners/{id}/toggle")
@DeleteMapping("/banners/{id}")
@GetMapping("/reviews")
@GetMapping("/reviews/paged")
@PatchMapping("/reviews/{id}/status")
@PostMapping("/reviews/{id}/reply")
@DeleteMapping("/reviews/{id}")
@GetMapping("/faqs")
@PostMapping("/faqs")
@PutMapping("/faqs/{id}")
@PatchMapping("/faqs/{id}/toggle")
@DeleteMapping("/faqs/{id}")

## backend\src\main\java\com\smartbox\backend\controller\admin\DashboardController.java

@RequestMapping("/api/dashboard")
@GetMapping("/stats")

## backend\src\main\java\com\smartbox\backend\controller\admin\NotificationController.java

@RestController @RequiredArgsConstructor @RequestMapping("/api/notifications")
@PostMapping("/tokens") public Map<String,Object> register(@Valid @RequestBody Token request){return push.register(request.token());}
@DeleteMapping("/tokens/{id}") public void remove(@PathVariable UUID id){push.remove(id);}
@GetMapping public List<Map<String,Object>> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return push.list(page,size);}
@PatchMapping("/{id}/read") public void read(@PathVariable UUID id){push.read(id);}
@PutMapping("/preferences/{event}") public void preference(@PathVariable String event,@Valid @RequestBody Preference request){push.preference(event,request.enabled());}

## backend\src\main\java\com\smartbox\backend\controller\admin\RevenueReportController.java

@RequestMapping("/api/reports")
@GetMapping("/{code}")
@PostMapping("/{code}/export")
@GetMapping("/po/summary")
@PostMapping("/po/export")

## backend\src\main\java\com\smartbox\backend\controller\admin\SettingsController.java

@RequestMapping("/api/settings")
@GetMapping
@GetMapping("/templates")
@GetMapping("/templates/{code}")
@PostMapping("/templates")
@PostMapping("/templates/{code}/reset-default")
@PostMapping("/templates/{code}/test-send")

## backend\src\main\java\com\smartbox\backend\controller\admin\UserController.java

@RequestMapping("/api/users")
@GetMapping
@GetMapping("/paged")
@GetMapping("/{id}/details")
@PatchMapping("/{id}/toggle-lock")
@PatchMapping("/{id}/role")
@PostMapping("/staff")
@PostMapping("/{id}/send-reset-otp")
@PostMapping("/{id}/verify-reset-password")

## backend\src\main\java\com\smartbox\backend\controller\auth\AuthController.java

@RequestMapping("/api/auth")
@GetMapping("/me")
@RequestMapping(value = "/me", method = {RequestMethod.PUT, RequestMethod.POST, RequestMethod.PATCH})
@PostMapping(value = "/avatar", consumes = "multipart/form-data")
@PostMapping("/login")
@PostMapping("/refresh-token")
@PostMapping("/logout")

## backend\src\main\java\com\smartbox\backend\controller\auth\CustomerAccountController.java

@RestController @RequestMapping("/api/customer") @RequiredArgsConstructor
@GetMapping("/profile") public Map<String,Object> profile(){return customers.profile();}
@PutMapping("/profile") public Map<String,Object> profile(@Valid @RequestBody CustomerRequests.ProfileUpdate request){return customers.updateProfile(request);}
@GetMapping("/addresses") public List<Map<String,Object>> addresses(){return customers.addresses();}
@PostMapping("/addresses") public ResponseEntity<Map<String,Object>> create(@Valid @RequestBody CustomerRequests.Address request){return ResponseEntity.status(201).body(customers.saveAddress(null,request));}
@PutMapping("/addresses/{id}") public Map<String,Object> update(@PathVariable UUID id,@Valid @RequestBody CustomerRequests.Address request){return customers.saveAddress(id,request);}
@DeleteMapping("/addresses/{id}") public ResponseEntity<Void> delete(@PathVariable UUID id){customers.deleteAddress(id);return ResponseEntity.noContent().build();}

## backend\src\main\java\com\smartbox\backend\controller\auth\CustomerAuthController.java

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
@PostMapping("/register") public Map<String,Object> register(@Valid @RequestBody CustomerRequests.Register request){return auth.register(request);}
@PostMapping("/forgot-password") public Map<String,Object> forgot(@Valid @RequestBody CustomerRequests.ForgotPassword request){return auth.forgot(request);}
@PostMapping("/reset-password") public Map<String,Object> reset(@Valid @RequestBody CustomerRequests.ResetPassword request){return auth.reset(request);}
@PostMapping("/change-password") public Map<String,Object> change(@Valid @RequestBody CustomerRequests.ChangePassword request){return auth.change(request);}

## backend\src\main\java\com\smartbox\backend\controller\catalog\ProductController.java

@RequestMapping("/api/products")
@GetMapping("/inventory-movements")
@PostMapping(value="/images",consumes="multipart/form-data")
@PatchMapping("/{id}/variants/{variantId}/stock")
@GetMapping("/{id}/inventory-history")
@GetMapping("/{id}")
@GetMapping
@GetMapping("/paged")
@GetMapping("/by-category/{slug}")
@GetMapping("/categories")
@GetMapping("/categories/{id}")
@PostMapping("/categories")
@PutMapping("/categories/{id}")
@DeleteMapping("/categories/{id}")
@PostMapping
@PutMapping("/{id}")
@DeleteMapping("/{id}")
@PatchMapping("/{id}/stock")
@GetMapping("/{id}/variants")

## backend\src\main\java\com\smartbox\backend\controller\catalog\PromotionController.java

@RequestMapping("/api/promotions")
@GetMapping
@GetMapping("/paged")
@GetMapping("/{id}")
@PostMapping
@PutMapping("/{id}")
@DeleteMapping("/{id}")
@PatchMapping("/{id}/toggle")
@PostMapping("/validate")

## backend\src\main\java\com\smartbox\backend\controller\catalog\VariantSpecificationController.java

@PatchMapping("/api/products/{product}/variants/{id}/specifications")

## backend\src\main\java\com\smartbox\backend\controller\commerce\CommerceController.java

@PostMapping("/api/orders")
@GetMapping("/api/orders/{id}")
@GetMapping("/api/orders/my-orders")
@GetMapping("/api/orders/{id}/history")
@PostMapping("/api/orders/{id}/items")
@PatchMapping("/api/orders/{id}/items/{variantId}")
@DeleteMapping("/api/orders/{id}/items/{variantId}")
@PostMapping("/api/orders/{id}/voucher")
@PostMapping("/api/orders/{id}/checkout")
@GetMapping("/api/orders/{id}/payment-session")
@PostMapping("/api/orders/{id}/cancel")
@PostMapping("/api/orders/{id}/customer-decision")
@PostMapping("/api/payments/callback")
@GetMapping("/api/tickets")
@GetMapping("/api/tickets/{id}")
@GetMapping("/api/orders/{id}/ticket")
@PostMapping("/api/tickets/{id}/approve")
@PostMapping("/api/tickets/{id}/return")
@PostMapping("/api/tickets/{id}/resubmit")
@PostMapping("/api/tickets/{id}/reject")
@PostMapping("/api/tickets/{id}/items/{orderItemId}/approve")
@PostMapping("/api/tickets/{id}/items/{orderItemId}/reject")
@PostMapping("/api/orders/{id}/shipment/ship")
@PostMapping("/api/orders/{id}/shipment/deliver")
@PostMapping("/api/orders/{id}/devices")
@GetMapping("/api/admin/refunds")
@PostMapping("/api/admin/refunds/{id}/complete")
@GetMapping("/api/admin/emails")
@PostMapping("/api/admin/emails/{id}/resend")
@GetMapping("/api/admin/emails/{id}/status")
@PostMapping("/api/admin/emails/test-send")

## backend\src\main\java\com\smartbox\backend\controller\commerce\CustomerOrderController.java

@RequestMapping("/api/customer/orders")
@GetMapping
@GetMapping("/{id}")
@GetMapping("/by-payment/{paymentId}")

## backend\src\main\java\com\smartbox\backend\controller\commerce\DeliveryInstallationController.java

@GetMapping("/api/delivery-installations/availability")
@PostMapping(value = "/api/delivery-installations/upload-proof", consumes = "multipart/form-data")
@PostMapping("/api/delivery-installations/{id}/submit-completion")
@PostMapping("/api/delivery-installations/{id}/approve-completion")
@PostMapping("/api/delivery-installations/{id}/reject-completion")
@GetMapping("/api/technician/daily-tasks")
@PostMapping("/api/orders/{id}/delivery-installation")
@GetMapping("/api/orders/{id}/delivery-installation")
@GetMapping("/api/delivery-installations/eligible-orders")
@GetMapping("/api/delivery-installations/technicians")
@GetMapping("/api/delivery-installations/my-jobs")
@GetMapping("/api/delivery-installations")
@GetMapping("/api/delivery-installations/{id}")
@GetMapping("/api/delivery-installations/{id}/checks")
@PostMapping("/api/delivery-installations/{id}/start")
@PostMapping("/api/delivery-installations/{id}/confirm-delivery")
@PostMapping("/api/delivery-installations/{id}/devices")
@PostMapping("/api/delivery-installations/{id}/checks/commands")
@PostMapping("/api/delivery-installations/{id}/confirm-installation")
@PostMapping("/api/delivery-installations/{id}/acceptance")
@PostMapping("/api/delivery-installations/{id}/fail")
@PostMapping("/api/delivery-installations/{id}/reassign")

## backend\src\main\java\com\smartbox\backend\controller\commerce\MockPaymentController.java

@RequestMapping({"/mock-payment/payments","/api/mock-payment/payments"})
@GetMapping("/{id}")
@PostMapping("/{id}/complete")

## backend\src\main\java\com\smartbox\backend\controller\commerce\OrderController.java

@RequestMapping("/api/orders")
@GetMapping
@GetMapping("/paged")
@GetMapping("/counts")
@PatchMapping("/{id}/status")
@PatchMapping("/{id}/tracking")

## backend\src\main\java\com\smartbox\backend\controller\commerce\OrderTrackingController.java

@GetMapping("/api/orders/{id}/timeline")
@GetMapping("/api/delivery-installations/dashboard")

## backend\src\main\java\com\smartbox\backend\controller\commerce\PaymentAuditController.java

@GetMapping("/api/payments/mode")
@GetMapping("/api/orders/{id}/payment-reconciliation")

## backend\src\main\java\com\smartbox\backend\controller\commerce\PricingController.java

@RequestMapping("/api/pricing")
@PostMapping("/calculate")

## backend\src\main\java\com\smartbox\backend\controller\commerce\SalesInvoiceController.java

@PostMapping("/api/orders/{id}/sales-invoice")
@GetMapping("/api/orders/{id}/sales-invoice")
@GetMapping(value = "/api/orders/{id}/sales-invoice.html", produces = "text/html;charset=UTF-8")

## backend\src\main\java\com\smartbox\backend\controller\commerce\VnpayController.java

@RequestMapping("/api/payments/vnpay")
@PostMapping("/create-url")
@GetMapping("/ipn")
@GetMapping("/return")

## backend\src\main\java\com\smartbox\backend\controller\customer\CustomerDirectoryController.java

@RequestMapping("/api/admin/customers")
@GetMapping
@GetMapping("/{id}")
@PostMapping
@PutMapping("/{id}")

## backend\src\main\java\com\smartbox\backend\controller\device\DeviceController.java

@RequestMapping("/api/devices")
@GetMapping
@GetMapping("/paged")
@PatchMapping("/{id}/status")

## backend\src\main\java\com\smartbox\backend\controller\device\DeviceWorkflowController.java

@PostMapping("/api/devices/register")

## backend\src\main\java\com\smartbox\backend\controller\warranty\CustomerWarrantyController.java

@GetMapping("/api/customer/warranties")
@PostMapping(value = "/api/customer/warranties/{id}/images", consumes = "multipart/form-data")
@PostMapping("/api/customer/warranty-claims")
@GetMapping("/api/customer/warranty-claims")
@GetMapping("/api/customer/warranty-claims/{id}")

## backend\src\main\java\com\smartbox\backend\controller\warranty\WarrantyController.java

@RequestMapping("/api/warranties")
@GetMapping("/technicians") public List<Map<String,Object>> technicians(){return warrantyService.technicians();}
@GetMapping("/lookup")
@GetMapping("/claims")
@GetMapping("/claims/paged")
@PatchMapping("/claims/{id}/assign")
@PatchMapping("/claims/{id}/status")
@PatchMapping("/claims/{id}/notes")
