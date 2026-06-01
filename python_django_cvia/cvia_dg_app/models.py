from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.core.validators import RegexValidator, EmailValidator
import hashlib
import secrets
from django.conf import settings
from django.utils.timezone import now
from django.core.exceptions import ValidationError
import re
import datetime

class Candidate(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    resume = models.TextField(blank=True, null=True)  # Aquí guardamos el CV generado

    def __str__(self):
        return self.name

# Opciones codificadas para el tipo de documento de identidad
DOCUMENTO_CHOICES = [
    ('01', 'Documento Nacional de Identidad (DNI)'),
    ('02', 'Pasaporte'),
    ('03', 'Carnet de Extranjería'),
    ('04', 'Registro Único de Contribuyentes (RUC)'),
]

# Opciones codificadas para el estado del usuario
ESTADO_CHOICES = [
    ('1', 'Activo'),
    ('2', 'Inactivo'),
]

# Opciones codificadas para la situación del usuario
SITUACION_CHOICES = [
    ('1', 'Normal'),
    ('2', 'Bloqueado'),
    ('3', 'Suspendido'),
    ('4', 'Baja'),
]

# class Usuarios(models.Model):
class Usuarios(AbstractUser):    
    nombre_usuario = models.CharField(
        max_length=50,
        unique=True,
        primary_key=True,
        validators=[RegexValidator(regex=r'^[a-zA-Z0-9_]+$', message="Solo se permiten letras, números y guion bajo.")]
    )

    email1 = models.EmailField(validators=[EmailValidator(message="Debe ser un email válido.")])
    email2 = models.EmailField(blank=True, null=True, validators=[EmailValidator(message="Debe ser un email válido.")])

    apellido_paterno = models.CharField(
        max_length=50,
        validators=[RegexValidator(regex=r'^[a-zA-Z]+$', message="Solo se permiten letras.")]
    )

    apellido_materno = models.CharField(
        max_length=50,
        validators=[RegexValidator(regex=r'^[a-zA-Z]+$', message="Solo se permiten letras.")]
    )

    nombres = models.CharField(
        max_length=100,
        validators=[RegexValidator(regex=r'^[a-zA-Z ]+$', message="Solo se permiten letras.")]
    )

    celular = models.CharField(
        max_length=15,
        validators=[RegexValidator(regex=r'^\d{9,15}$', message="Debe ser un número de celular válido.")]
    )

    direccion = models.CharField(max_length=255)

    tipo_documento_identidad = models.CharField(
        max_length=2,
        choices=DOCUMENTO_CHOICES,
        validators=[RegexValidator(regex=r'^(01|02|03|04)$', message="Debe ser un tipo de documento válido.")]
    )

    numero_documento_identidad = models.CharField(max_length=20)

    fecha_creacion = models.DateTimeField(auto_now_add=True, editable=False)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    estado = models.CharField(
        max_length=1,
        choices=ESTADO_CHOICES,
        default='1'  # Por defecto, el usuario inicia como activo
    )

    situacion = models.CharField(
        max_length=1,
        choices=SITUACION_CHOICES,
        default='1'  # Por defecto, el usuario inicia como normal
    )

    fecha_baja = models.DateTimeField(blank=True, null=True)

    objects = UserManager()

    def dar_de_baja(self):
        """Marca al usuario como dado de baja, registra la fecha y cambia el estado a inactivo y la situación a baja."""
        self.estado = '2'  # Código de estado para Inactivo
        self.situacion = '4'  # Código de situación para Baja
        self.fecha_baja = now()
        self.save()

    def bloquear_usuario(self):
        """Bloquea temporalmente al usuario."""
        self.situacion = '2'  # Código de situación para Bloqueado
        self.save()

    def suspender_usuario(self):
        """Suspende temporalmente al usuario."""
        self.situacion = '3'  # Código de situación para Suspendido
        self.save()

    def activar_usuario(self):
        """Reactiva al usuario si estaba bloqueado, suspendido o dado de baja."""
        self.estado = '1'  # Código de estado para Activo
        self.situacion = '1'  # Código de situación para Normal
        self.fecha_baja = None
        self.save()

    def __str__(self):
        return self.nombre_usuario

# Opciones codificadas para el estado del password
ESTADO_CHOICES = [
    ('1', 'Activo'),
    ('2', 'Inactivo'),
]

# Opciones codificadas para la condición del password
CONDICION_CHOICES = [
    ('1', 'Normal'),
    ('2', 'Bloqueado Temporalmente'),
]

class UsuariosPasswords(models.Model):
    usuario = models.ForeignKey(
        Usuarios, 
        on_delete=models.CASCADE, 
        to_field='nombre_usuario',  
        related_name="passwords"
    )
    password_hash = models.CharField(max_length=128)
    salt = models.CharField(max_length=64)
    fecha_creacion = models.DateTimeField(auto_now_add=True, editable=False)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    estado = models.CharField(max_length=1, choices=ESTADO_CHOICES, default='1')
    condicion = models.CharField(max_length=1, choices=CONDICION_CHOICES, default='1')
    intentos_fallidos = models.IntegerField(default=0)
    tiempo_bloqueo = models.DateTimeField(blank=True, null=True)

    def generar_salt(self):
        """Genera un salt aleatorio único para la contraseña."""
        return secrets.token_hex(32)

    def hashear_password(self, password):
        """Hashea la contraseña usando PBKDF2 con SHA-256."""
        self.salt = self.generar_salt()
        iteraciones = getattr(settings, "PASSWORD_HASH_ITERATIONS", 100000)
        hash_valor = hashlib.pbkdf2_hmac('sha256', password.encode(), self.salt.encode(), iteraciones)
        return hash_valor.hex()

    def establecer_password(self, password):
        """Establece un nuevo password validando seguridad y gestionando historial."""
        if not self.validar_seguridad(password):
            raise ValueError("La contraseña no cumple con los requisitos de seguridad.")

        # Marcar passwords anteriores como inactivos
        UsuariosPasswords.objects.filter(usuario=self.usuario,estado='1').update(estado='2', fecha_actualizacion = now())
        
        # Registrar nuevo password activo
        self.password_hash = self.hashear_password(password)
        self.estado = '1'
        self.fecha_actualizacion = now()
        self.save()

    def validar_seguridad(self, password):
        """Verifica que el password cumple con la longitud y requisitos de seguridad."""
        if len(password) < 8 or len(password) > 16:
            return False
        if not any(char.isdigit() for char in password):
            return False
        if not any(char.isupper() for char in password):
            return False
        if not any(char.islower() for char in password):
            return False
        if not any(char in "!@#$%^&*()-_=+" for char in password):
            return False
        return True

    def registrar_intento_fallido(self):
        """Incrementa intentos fallidos y bloquea temporalmente tras 5 intentos incorrectos."""
        self.intentos_fallidos += 1
        self.fecha_actualizacion = now()

        if self.intentos_fallidos >= 5:
            self.condicion = '2'  # Código de condición para Bloqueado Temporalmente
            self.tiempo_bloqueo = now() + datetime.timedelta(minutes=5)  # Bloqueo por 5 minutos

        self.save()

    def desbloquear_password(self):
        """Desbloquea la cuenta si ha pasado el tiempo de bloqueo."""
        if self.tiempo_bloqueo and now() >= self.tiempo_bloqueo:
            self.intentos_fallidos = 0
            self.condicion = '1'  # Código de condición para Normal
            self.tiempo_bloqueo = None
            self.fecha_actualizacion = now()
            self.save()

    def __str__(self):
        return f"Password de {self.usuario.nombre_usuario}"

# Nuevo modelo para los datos del CV
class DatosPrimerCV(models.Model):
    # Relación con el usuario (cada CV pertenece a un usuario)
    usuario = models.ForeignKey(
        Usuarios, 
        on_delete=models.CASCADE, 
        related_name='cv_datos'
    )
    
    # Campos de texto (Inputs)
    apellido_paterno = models.CharField(max_length=100)
    apellido_materno = models.CharField(max_length=100, blank=True, null=True)
    nombres = models.CharField(max_length=150)
    email = models.EmailField()
    celular = models.CharField(max_length=20)
    
    # Campos de fecha y profesión
    fecha_nacimiento = models.DateField()
    profesion = models.CharField(max_length=200)
    
    # Campos de texto largo (Textareas)
    objetivo = models.TextField()
    experiencia = models.TextField(blank=True, null=True)
    cursos = models.TextField(blank=True, null=True)
    habilidades = models.TextField()

    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    ip_creacion = models.CharField(max_length=50)
    ip_actualizacion = models.CharField(max_length=50, blank=True, null=True)
    archivo_pdf = models.FileField(upload_to='cvs_pdf/', blank=True, null=True)

    def __str__(self):
        return f"CV de {self.nombres} {self.apellido_paterno} - {self.usuario.nombre_usuario}"

    class Meta:
        verbose_name = "Datos de Primer CV"
        verbose_name_plural = "Datos de Primeros CVs"


class FortalezasHabilidades(models.Model):
    # Relación con el usuario
    usuario = models.ForeignKey(
        'Usuarios', 
        on_delete=models.CASCADE, 
        related_name='analisis_potencial'
    )
    
    # Mapeo del textarea: [(ngModel)]="cv.actividades"
    actividades = models.TextField(
        help_text="Actividades o experiencias desarrolladas en los últimos años."
    )
    
    # Mapeo del checkbox: [(ngModel)]="cv.adjuntarOF"
    adjuntar_al_cv = models.BooleanField(
        default=False,
        verbose_name="Considerar en el CV"
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    ip_creacion = models.CharField(max_length=50)
    ip_actualizacion = models.CharField(max_length=50, null=True)

    def __str__(self):
        return f"Análisis de potencial - {self.usuario.nombre_usuario} ({self.fecha_actualizacion.strftime('%d/%m/%Y')})"

    class Meta:
        verbose_name = "Análisis de Potencial"
        verbose_name_plural = "Análisis de Potenciales"