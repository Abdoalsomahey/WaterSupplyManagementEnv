from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from myapp.models import Order
from myapp.serializers import OrderSerializer
from myapp.permissions import IsAdmin, IsDriver


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]


    filterset_fields = ["status", "customer__full_name", "driver__username"]
    search_fields = ["customer__full_name", "driver__username", "address"]
    ordering_fields = ["created_at", "confirmed_at", "status"]
    ordering = ["-created_at"]


class DriverOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsDriver]
    queryset = Order.objects.none()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["customer__full_name", "address"]
    ordering_fields = ["created_at", "confirmed_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Order.objects.filter(driver=self.request.user)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        order = self.get_object()
        if order.driver != request.user:
            return Response({"error": "This order is not assigned to you"}, status=403)
        if order.status != "pending":
            return Response({"error": "Order already confirmed or completed"}, status=400)
        order.confirm()
        serializer = self.get_serializer(order)
        return Response({
            "message": "Order confirmed",
            "confirmed_at": order.confirmed_at,
            "order": serializer.data
        }, status=200)
