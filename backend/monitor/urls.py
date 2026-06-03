from django.urls import path
from . import views

urlpatterns = [
    path('endpoints', views.get_all_endpoints, name='get_all_endpoints'),
]
