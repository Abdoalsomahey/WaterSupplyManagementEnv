from rest_framework import viewsets, filters
from myapp.models import User, Customer
from myapp.serializers import UserSerializer, CustomerSerializer
from myapp.permissions import IsAdmin
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role']  
    search_fields = ['username', 'first_name', 'last_name', 'phone', 'email']
    ordering_fields = ['id', 'username', 'role']  
    ordering = ['id']  


# Customers
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "area", "zone_number", "plot_number", "property_type", "account_number"
    ]  
    search_fields = ["full_name", "phone", "location_link"]
    ordering_fields = ["id", "full_name", "account_number", "starting_date"]
    ordering = ["id"]
