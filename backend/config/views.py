import time
from datetime import timedelta
from django.shortcuts import render
from django.http import JsonResponse
from monitor.models import Endpoints

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def home(request):
    return render(request, 'home.html')

def health(request):
    start_time = time.time()
    
    response_data = {'status': 'ok'}
    status_code = 200
    
    response = JsonResponse(response_data, status=status_code)
    
    end_time = time.time()
    duration = timedelta(seconds=end_time - start_time)
    
    Endpoints.objects.create(
        url=request.build_absolute_uri(),
        status_code=status_code,
        response_time=duration,
        ip_address=get_client_ip(request),
        is_active=True
    )
    
    return response

import json
from django.contrib.auth import authenticate, login, logout

def api_login(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({'status': 'success', 'user': user.username})
            else:
                return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

def api_logout(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

def api_user(request):
    if request.user.is_authenticated:
        return JsonResponse({'status': 'success', 'user': request.user.username})
    return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
