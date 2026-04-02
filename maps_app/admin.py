from django.contrib import admin
from .models import SavedLocation

@admin.register(SavedLocation)
class SavedLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'latitude', 'longitude', 'created_at')
    list_filter = ('user',)
