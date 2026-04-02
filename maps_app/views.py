import json
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from .models import SavedLocation

def map_view(request):
    return render(request, 'maps_app/map.html')

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('map')
    else:
        form = UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})

@login_required
def save_location(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description', '')
            latitude = float(data.get('latitude'))
            longitude = float(data.get('longitude'))

            location = SavedLocation.objects.create(
                user=request.user,
                name=name,
                description=description,
                latitude=latitude,
                longitude=longitude
            )
            return JsonResponse({'status': 'success', 'id': location.id})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@login_required
def get_saved_locations(request):
    locations = SavedLocation.objects.filter(user=request.user)
    data = [
        {
            'id': loc.id,
            'name': loc.name,
            'description': loc.description,
            'latitude': loc.latitude,
            'longitude': loc.longitude
        } for loc in locations
    ]
    return JsonResponse({'locations': data})

@login_required
def delete_location(request, location_id):
    if request.method == 'DELETE':
        try:
            location = SavedLocation.objects.get(id=location_id, user=request.user)
            location.delete()
            return JsonResponse({'status': 'success'})
        except SavedLocation.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Location not found'}, status=404)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
