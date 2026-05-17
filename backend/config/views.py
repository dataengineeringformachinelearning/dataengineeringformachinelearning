from django.shortcuts import render
from django.http import JsonResponse

def home(request):
    return render(request, 'home.html')

def health_check(request):
    return JsonResponse({'status': 'ok'})
