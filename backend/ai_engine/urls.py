from django.urls import path
from .views import run_code, health_check

urlpatterns = [
    path("run/", run_code),
    path("run-code/", run_code),
    path("health/", health_check),
    path("health", health_check),
]