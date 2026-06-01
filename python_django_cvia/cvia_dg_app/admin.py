from django.contrib import admin
from django.apps import apps
from django.db import models

# Obtener todos los modelos de la app actual
app_models = apps.get_app_config('cvia_dg_app').get_models()

for model in app_models:
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass
