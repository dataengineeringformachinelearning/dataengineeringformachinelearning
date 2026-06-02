import time
from datetime import timedelta
from django.shortcuts import render
from django.http import JsonResponse
from monitoring.models import Endpoints

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def home(request):
    return render(request, 'home.html')

def health_check(request):
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
