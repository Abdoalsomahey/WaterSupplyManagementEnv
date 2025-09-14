# myapp/urls.py
from django.urls import path, include
from .views.auth import LoginView, LogoutView, CheckAuthView
from .views.users import UserViewSet, CustomerViewSet
from .views.order import OrderViewSet, DriverOrderViewSet
from .views.invoice import InvoiceViewSet
from .views.export import ExportOrdersExcelView, ExportUsersExcelView, ExportCustomersExcelView,\
                          ExportInvoicesExcelView, ExportInvoicesPDFView
from .views import views
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'driver/orders', DriverOrderViewSet, basename='driver-orders')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', views.homepage, name='homepage'),
    path('log_in/', LoginView.as_view(), name='login'), # POST
    path('log_out/', LogoutView.as_view(), name='logout'), # POST
    path('check-auth/', CheckAuthView.as_view(), name='check_auth'),
	path("orders/export/", ExportOrdersExcelView.as_view(), name="export-orders-excel"),
	path("users/export/", ExportUsersExcelView.as_view(), name="export-users-excel"),
    path("customers/export/", ExportCustomersExcelView.as_view(), name="export-customers-excel"),
	path("invoices/export-excel/", ExportInvoicesExcelView.as_view(), name="export-invoices-excel"),
    path("invoices/export-pdf/", ExportInvoicesPDFView.as_view(), name="export-invoices-pdf"),
	path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
	path("", include(router.urls)),
]