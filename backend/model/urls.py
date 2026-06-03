from django.urls import path
from . import views

urlpatterns = [
    path('train/', views.train_model, name='train_model'),
    path('latest/', views.get_latest_training, name='latest_training'),
]
