from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.conf import settings
from .models import Room
import requests

@login_required
def create_room(request):
    if request.method == 'POST':
        name = request.POST.get('name', 'My Meeting')
        room = Room.objects.create(name=name, host=request.user)
        return redirect('room', code=room.code)
    return render(request, 'meetings/create_room.html')

@login_required
def join_room(request):
    if request.method == 'POST':
        code = request.POST.get('code', '').strip()
        room = get_object_or_404(Room, code=code)
        return redirect('room', code=room.code)
    return render(request, 'meetings/join_room.html')

@login_required
def room(request, code):
    room = get_object_or_404(Room, code=code)
    return render(request, 'meetings/room.html', {'room': room})

@login_required
def ice_servers(request):
    """Return ICE server config including TURN credentials from Metered.ca"""
    api_key = getattr(settings, 'METERED_API_KEY', '')
    app_name = getattr(settings, 'METERED_APP_NAME', '')

    ice_servers = [{'urls': 'stun:stun.l.google.com:19302'}]

    if api_key and app_name:
        try:
            url = f'https://{app_name}.metered.live/api/v1/turn/credentials?apiKey={api_key}'
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                ice_servers = resp.json()
        except Exception as e:
            print(f'TURN fetch error: {e}')

    return JsonResponse({'iceServers': ice_servers})
