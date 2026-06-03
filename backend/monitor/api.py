from ninja import Router, Schema
from typing import List
from monitor.models import Endpoints
import datetime

router = Router()

class EndpointOut(Schema):
    id: str
    url: str
    last_tested: datetime.datetime
    status_code: int
    response_time: str
    ip_address: str
    is_active: bool

@router.get("/endpoints", response=List[EndpointOut])
def get_all_endpoints(request):
    endpoints = Endpoints.objects.all()
    data = []
    for endpoint in endpoints:
        data.append({
            'id': str(endpoint.id),
            'url': endpoint.url,
            'last_tested': endpoint.last_tested,
            'status_code': endpoint.status_code,
            'response_time': str(endpoint.response_time),
            'ip_address': endpoint.ip_address,
            'is_active': endpoint.is_active
        })
    return data
