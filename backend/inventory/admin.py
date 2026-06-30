from django.contrib import admin
from .models import Category, Unit, Item, Vendor, Purchase

# Register your models here.
admin.site.register(Category)
admin.site.register(Unit)
admin.site.register(Item)
admin.site.register(Vendor)
admin.site.register(Purchase)
