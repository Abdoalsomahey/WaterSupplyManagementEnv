from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from myapp.models import Invoice
from myapp.serializers import InvoiceSerializer
from myapp.permissions import IsAdmin, IsAccountant


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.filter(order__status="confirmed").select_related("order", "order__customer", "issued_by")
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, (IsAdmin | IsAccountant)]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["paid", "order__customer__full_name"]
    search_fields = ["order__customer__full_name", "order__id"]
    ordering_fields = ["created_at", "total_amount"]
    ordering = ["-created_at"]