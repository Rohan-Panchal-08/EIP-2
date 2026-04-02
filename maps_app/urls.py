from django.urls import path
from . import views

urlpatterns = [
    path('', views.map_view, name='map'),
    path('register/', views.register, name='register'),
    path('api/save_location/', views.save_location, name='save_location'),
    path('api/get_locations/', views.get_saved_locations, name='get_locations'),
    path('api/delete_location/<int:location_id>/', views.delete_location, name='delete_location'),
]
