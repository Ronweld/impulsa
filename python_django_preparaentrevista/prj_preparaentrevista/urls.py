"""
URL configuration for prj_preparaentrevista project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
"""
from django.contrib import admin
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
]
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from app_preparaentrevista.views import InterviewSessionViewSet, JobDescriptionViewSet, \
    EvaluationResultViewSet, AnswerEvaluationViewSet, ChatMessageViewSet, UserViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

router = routers.DefaultRouter()
router.register(r'sessions', InterviewSessionViewSet, basename='session')
router.register(r'jobdescriptions', JobDescriptionViewSet)  
router.register(r'evaluationresult', EvaluationResultViewSet) 
router.register(r'answerevaluation', AnswerEvaluationViewSet) 
router.register(r'chatmessages', ChatMessageViewSet)
router.register("users", UserViewSet, basename="users")

urlpatterns = [
    path('admin/', admin.site.urls),   # 🔑 habilita el admin
    path('', include(router.urls)),    # tus rutas de DRF
    # Endpoints JWT
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]