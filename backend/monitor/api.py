from ninja import Router, Schema
from typing import List, Optional
from monitor.models import Endpoints, StatusPage, MonitoredService
from django.shortcuts import get_object_or_404
from ninja.errors import HttpError
import datetime

router = Router()

class EndpointOut(Schema):
    id: str
    url: str
    last_tested: datetime.datetime
    status_code: int
    response_time: str
    ip_address: Optional[str]
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

class StatusPageIn(Schema):
    title: str
    slug: str
    description: Optional[str] = ""

class StatusPageOut(Schema):
    id: str
    title: str
    slug: str
    description: str
    created_at: datetime.datetime
    user_id: Optional[int] = None

@router.get("/status_pages", response=List[StatusPageOut])
def list_status_pages(request):
    pages = StatusPage.objects.all()
    out = []
    for p in pages:
        out.append(StatusPageOut(
            id=str(p.id),
            title=p.title,
            slug=p.slug,
            description=p.description,
            created_at=p.created_at,
            user_id=p.user_id
        ))
    return out

@router.post("/status_pages", response=StatusPageOut)
def create_status_page(request, payload: StatusPageIn):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    if StatusPage.objects.filter(slug=payload.slug).exists():
        raise HttpError(400, "Slug already exists")
    page = StatusPage.objects.create(
        user=request.user,
        title=payload.title,
        slug=payload.slug,
        description=payload.description
    )
    return StatusPageOut(
        id=str(page.id),
        title=page.title,
        slug=page.slug,
        description=page.description,
        created_at=page.created_at,
        user_id=page.user_id
    )

@router.delete("/status_pages/{page_id}")
def delete_status_page(request, page_id: str):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    page = get_object_or_404(StatusPage, id=page_id, user=request.user)
    page.delete()
    return {"success": True}


class MonitoredServiceIn(Schema):
    name: str
    url: str

class MonitoredServiceOut(Schema):
    id: str
    name: str
    url: str
    status_page_id: str
    created_at: datetime.datetime

@router.get("/status_pages/{page_id}/services", response=List[MonitoredServiceOut])
def list_services(request, page_id: str):
    page = get_object_or_404(StatusPage, id=page_id)
    services = page.services.all()
    out = []
    for s in services:
        out.append(MonitoredServiceOut(
            id=str(s.id),
            name=s.name,
            url=s.url,
            status_page_id=str(s.status_page_id),
            created_at=s.created_at
        ))
    return out

@router.post("/status_pages/{page_id}/services", response=MonitoredServiceOut)
def add_service(request, page_id: str, payload: MonitoredServiceIn):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    page = get_object_or_404(StatusPage, id=page_id, user=request.user)
    service = MonitoredService.objects.create(
        status_page=page,
        name=payload.name,
        url=payload.url
    )
    return MonitoredServiceOut(
        id=str(service.id),
        name=service.name,
        url=service.url,
        status_page_id=str(service.status_page_id),
        created_at=service.created_at
    )

@router.delete("/services/{service_id}")
def delete_service(request, service_id: str):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    service = get_object_or_404(MonitoredService, id=service_id, status_page__user=request.user)
    service.delete()
    return {"success": True}

from monitor.models import Incident

class IncidentIn(Schema):
    title: str
    message: str
    status: str

class IncidentOut(Schema):
    id: str
    title: str
    message: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    status_page_id: str

@router.get("/status_pages/{page_id}/incidents", response=List[IncidentOut])
def list_incidents(request, page_id: str):
    page = get_object_or_404(StatusPage, id=page_id)
    incidents = page.incidents.all()
    out = []
    for inc in incidents:
        out.append(IncidentOut(
            id=str(inc.id),
            title=inc.title,
            message=inc.message,
            status=inc.status,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            status_page_id=str(inc.status_page_id)
        ))
    return out

@router.post("/status_pages/{page_id}/incidents", response=IncidentOut)
def create_incident(request, page_id: str, payload: IncidentIn):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    page = get_object_or_404(StatusPage, id=page_id, user=request.user)
    incident = Incident.objects.create(
        status_page=page,
        title=payload.title,
        message=payload.message,
        status=payload.status
    )
    return IncidentOut(
        id=str(incident.id),
        title=incident.title,
        message=incident.message,
        status=incident.status,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        status_page_id=str(incident.status_page_id)
    )

@router.delete("/incidents/{incident_id}")
def delete_incident(request, incident_id: str):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    incident = get_object_or_404(Incident, id=incident_id, status_page__user=request.user)
    incident.delete()
    return {"success": True}
