"""
URL configuration for cvia_dg_prj project.

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
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from cvia_dg_app.views import CandidateViewSet, AuthController, CaptchaController, UsuarioView, UsuarioAPIView
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

router = DefaultRouter()
router.register(r'candidates', CandidateViewSet)

urlpatterns = [
    path("", RedirectView.as_view(url="/api/")),
    path("admin/", admin.site.urls),
    path('api/', include(router.urls)),
    #path('api/token/', AuthController.login_view, name='token_obtain_pair'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/get_csrf_token/', CaptchaController.get_csrf_token, name='get_csrf_token'),
    path('api/captcha/', CaptchaController.generate_captcha, name='generate_captcha'),
    path('api/validate/', CaptchaController.validate_captcha, name='validate_captcha'),
    path("usuarios/<str:action>/", UsuarioAPIView.as_view(), name="usuario_action"),
    path("usuarios/<str:action>/<str:nombre_usuario>/", UsuarioAPIView.as_view(), name="usuario_action_detail"),
]
