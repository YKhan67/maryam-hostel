from django.contrib import admin
from .models import City, Hostel, Building, Floor, Room, Bed, StudentProfile

# Register your models here.
admin.site.register(City)
admin.site.register(Hostel)
admin.site.register(Building)
admin.site.register(Floor)
admin.site.register(Room)
admin.site.register(Bed)
admin.site.register(StudentProfile)
