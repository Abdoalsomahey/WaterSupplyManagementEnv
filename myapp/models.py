from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from datetime import timedelta


class User(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("accountant", "Accountant"),
        ("driver", "Driver"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

class Customer(models.Model):
    full_name = models.CharField(max_length=255, unique=True, blank=True, null=True)

    area = models.CharField(max_length=255, blank=True, null=True)
    zone_number = models.CharField(max_length=100, blank=True, null=True)
    plot_number = models.CharField(max_length=100, blank=True, null=True)
    property_type = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    starting_date = models.DateField(blank=True, null=True)
    agreement_without_meter = models.BooleanField(default=False)

    weekly_trips = models.IntegerField(blank=True, null=True)
    two_trips = models.IntegerField(blank=True, null=True)
    three_trips = models.IntegerField(blank=True, null=True)
    four_trips = models.IntegerField(blank=True, null=True)

    gallons = models.CharField(max_length=100, blank=True, null=True)
    filling_stations = models.CharField(max_length=255, blank=True, null=True)
    location_link = models.URLField(blank=True, null=True)

    def __str__(self):
    	return f"{self.full_name} ({self.phone})"


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("completed", "Completed"),
        ("canceled", "Canceled"),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="orders")
    driver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'driver'})
    
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    def confirm(self):
        self.status = "confirmed"
        self.confirmed_at = timezone.now()
        self.save()

    def is_driver_late(self, minutes=30):
        if self.confirmed_at and self.created_at:
            return (self.confirmed_at - self.created_at).total_seconds() > minutes * 60
        return False

    def __str__(self):
        return f"Order for {self.customer.full_name} ({self.status})"

class Invoice(models.Model):
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="invoice",
        limit_choices_to={'status': 'confirmed'}
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role__in': ['admin', 'accountant']}
    )

    base_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    extra_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def calculate_total(self):
        tax_value = (self.base_amount * self.tax_percentage) / 100
        return (self.base_amount + tax_value + self.extra_fees) - self.discount_amount

    def save(self, *args, **kwargs):
        self.total_amount = self.calculate_total()
        super().save(*args, **kwargs)

    def mark_paid(self):
        self.paid = True
        self.save()

    def __str__(self):
        return f"Invoice #{self.id} - {self.customer.full_name} - Total: {self.total_amount}"