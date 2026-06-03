from django.http import JsonResponse
from monitor.models import Endpoints

def get_all_endpoints(request):
    endpoints = Endpoints.objects.all()
    data = []
    for endpoint in endpoints:
        data.append({
            'id': endpoint.id,
            'url': endpoint.url,
            'last_tested': endpoint.last_tested,
            'status_code': endpoint.status_code,
            'response_time': str(endpoint.response_time),
            'ip_address': endpoint.ip_address,
            'is_active': endpoint.is_active
        })
    return JsonResponse(data, safe=False)
