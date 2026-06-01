from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import StreamingHttpResponse, JsonResponse, HttpResponse
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_200_OK, HTTP_201_CREATED, HTTP_404_NOT_FOUND
from .models import Candidate, Usuarios, UsuariosPasswords
from .serializers import CandidateSerializer
from .curriculumia.app.cvia import cvia  # Importamos la clase cvia
import os
from django.shortcuts import get_object_or_404
from django.views import View
from django.utils.timezone import now
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from django.middleware.csrf import get_token
from django.db import IntegrityError
from hashlib import pbkdf2_hmac
import json
import logging

class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    logger = logging.getLogger(__name__)

    # - Establecer nombre del candidato
    @action(detail=False, methods=['post'])
    def set_nombre_candidato(self, request):
        """Asigna el nombre del candidato"""
        nombre = request.data.get("nombre", None)
        if not nombre:
            return Response({"error": "Falta el parámetro 'nombre'"}, status=HTTP_400_BAD_REQUEST)

        cv_generator = cvia()
        cv_generator.setNombreCandidato(nombre)
        return Response({"message": f"Nombre del candidato actualizado: {nombre}"}, status=HTTP_200_OK)

    # - Obtener nombre del candidato
    @action(detail=False, methods=['get'])
    def get_nombre_candidato(self, request):
        """Obtiene el nombre del candidato"""
        cv_generator = cvia()
        nombre = cv_generator.getNombreCandidato()
        return Response({"nombre_candidato": nombre}, status=HTTP_200_OK)

    # - Procesar documentos en un directorio
    @action(detail=False, methods=['post'])
    def procesa_documentos(self, request):
        """Procesa documentos de un directorio"""
        ruta_directorio = request.data.get("ruta_directorio", None)
        if not ruta_directorio:
            return Response({"error": "Falta 'ruta_directorio'"}, status=HTTP_400_BAD_REQUEST)

        cv_generator = cvia()
        documentos = cv_generator.procesa_documentos(ruta_directorio)
        return Response({"documentos_procesados": documentos}, status=HTTP_200_OK)
        
    # - Obtiene todos los archivos de un directorio
    @action(detail=False, methods=['post'])
    def obtener_archivos(self, request):
        """Obtiene todos los archivos de un directorio"""
        self.logger.info("obtener_archivos: inicio. ")
        directorio = request.data.get("directorio", None)
        if not directorio:
            return Response({"error": "Falta 'directorio'"}, status=HTTP_400_BAD_REQUEST)

        cv_generator = cvia(dir_personal=directorio)
        archivos = cv_generator.obtener_archivos(directorio)
        def file_stream():
            for file_name in archivos:
                #file_path = file_name #os.path.join(ruta_directorio, file_name)
                if os.path.isfile(file_name):
                    yield f"--FILE_START--{file_name}--\n".encode()  # Indicar inicio de archivo
                    with open(file_name, "rb") as f:
                        yield f.read()  # Enviar contenido binario
                    yield b"\n--FILE_END--\n"  # Indicar fin de archivo
        
        #return Response({"archivos": archivos}, status=HTTP_200_OK)
        self.logger.info("obtener_archivos: fin. ")
        return StreamingHttpResponse(file_stream(), content_type="application/octet-stream")

    # - Procesar un 煤nico documento
    @action(detail=False, methods=['post'])
    def procesa_documento(self, request):
        """Procesa un documento individual"""
        ruta_directorio = request.data.get("ruta_directorio", None)
        archivo = request.data.get("archivo", None)
        if not ruta_directorio or not archivo:
            return Response({"error": "Falta 'ruta_directorio' o 'archivo'"}, status=HTTP_400_BAD_REQUEST)

        cv_generator = cvia()
        documento = cv_generator.procesa_documento(ruta_directorio, archivo)
        return Response({"documento_procesado": documento}, status=HTTP_200_OK)

    # - Mostrar documentos guardados
    @action(detail=False, methods=['get'])
    def mostrar_documentos(self, request):
        """Muestra documentos guardados en el sistema"""
        cv_generator = cvia()
        cv_generator.mostrar_documentos()
        return Response({"message": "Documentos mostrados en la consola"}, status=HTTP_200_OK)

    # - Eliminar un documento
    @action(detail=False, methods=['delete'])
    def eliminar_documento(self, request):
        """Elimina un documento específico"""
        archivo = request.data.get("archivo", None)
        if not archivo:
            return Response({"error": "Falta el parámetro 'archivo'"}, status=HTTP_400_BAD_REQUEST)

        cv_generator = cvia()
        cv_generator.eliminar_documento(archivo)
        return Response({"message": f"Documento eliminado: {archivo}"}, status=HTTP_200_OK)

    # - Generar resumen ejecutivo
    @action(detail=False, methods=['get'])
    def generate_resumen_ejecutivo(self, request):
        """Genera un resumen ejecutivo"""
        self.logger.info("generate_resumen_ejecutivo: inicio. ")
        directorio = request.GET.get("directorio", None)
        idioma_respuesta = request.GET.get("idioma_respuesta", None)

        excluye_archivos = request.GET.getlist("excluye_archivos", None)
        if not directorio:
            return Response({"error": "Falta 'directorio'"}, status=HTTP_400_BAD_REQUEST)
        
        cv_generator = cvia(dir_personal=directorio)
        resumen = cv_generator.generate_resumen_ejecutivo(excluye_archivos=excluye_archivos, idioma_respuesta=idioma_respuesta)
        self.logger.info("generate_resumen_ejecutivo: inicio. ")
        return Response({"resumen_ejecutivo": resumen}, status=HTTP_200_OK)

    # - Generar CV por defecto
    @action(detail=False, methods=['get'])
    def generate_cv_defecto(self, request):
        """Genera un CV predeterminado"""
        directorio = request.GET.get("directorio", None)
        idioma_respuesta = request.GET.get("idioma_respuesta", None)
        excluye_archivos = request.GET.getlist("excluye_archivos", None)
        tipo_curriculum = request.GET.get("tipo_curriculum", None)
        if not directorio:
            return Response({"error": "Falta 'directorio'"}, status=HTTP_400_BAD_REQUEST)
            
        cv_generator = cvia(dir_personal=directorio)
        cv_text = cv_generator.generate_cv_defecto(excluye_archivos=excluye_archivos, tipo_curriculum = tipo_curriculum, idioma_respuesta=idioma_respuesta)
        return Response({"cv": cv_text}, status=HTTP_200_OK)

    # - Generar CV con requerimiento laboral
    @action(detail=False, methods=['post'])
    def generate_cv_requerimiento(self, request):
        """Genera un CV basado en un requerimiento laboral"""
        self.logger.info("generate_cv_requerimiento: inicio. ")
        req_laboral = request.data.get("req_laboral", "")
        idioma_respuesta = request.GET.get("idioma_respuesta", None)
        if not req_laboral:
            return Response({"error": "Falta el parámetro 'req_laboral'"}, status=HTTP_400_BAD_REQUEST)
        
        directorio = request.data.get("directorio", None)
        if not directorio:
            return Response({"error": "Falta 'directorio'"}, status=HTTP_400_BAD_REQUEST)
            
        excluye_archivos = request.data.get("excluye_archivos", [])
        tipo_curriculum = request.data.get("tipo_curriculum", None)
        
        if isinstance(excluye_archivos, str):
            excluye_archivos = [excluye_archivos]
        elif not isinstance(excluye_archivos, list):
            excluye_archivos = []
        
        cv_generator = cvia(dir_personal=directorio)
        cv_text = cv_generator.generate_cv_requerimiento(req_laboral=req_laboral, excluye_archivos=excluye_archivos, tipo_curriculum=tipo_curriculum, idioma_respuesta = idioma_respuesta )
        self.logger.info("generate_cv_requerimiento: fin. ")
        return Response({"cv_requerimiento": cv_text}, status=HTTP_200_OK)

    # - Generar CV por solicitud del usuario
    @action(detail=False, methods=['post'])
    def generate_solicitud_cv(self, request):
        """Genera un CV basado en la solicitud del usuario"""
        self.logger.info("generate_solicitud_cv: inicio. ")
        solicitud_usuario = request.data.get("solicitud_usuario", "")
        idioma_respuesta = request.GET.get("idioma_respuesta", None)
        if not solicitud_usuario:
            return Response({"error": "Falta el parámetro 'solicitud_usuario'"}, status=HTTP_400_BAD_REQUEST)
        
        directorio = request.data.get("directorio", None)
        if not directorio:
            return Response({"error": "Falta 'directorio'"}, status=HTTP_400_BAD_REQUEST)
            
        #excluye_archivos = request.data.getlist("excluye_archivos", None)
        excluye_archivos = request.data.get("excluye_archivos", [])
        tipo_curriculum = request.data.get("tipo_curriculum", None)
        
        if isinstance(excluye_archivos, str):
            excluye_archivos = [excluye_archivos]
        elif not isinstance(excluye_archivos, list):
            excluye_archivos = []
            
        cv_generator = cvia(dir_personal=directorio)
        cv_text = cv_generator.generate_solicitud_cv(solicitud_usuario=solicitud_usuario, 
                                                     excluye_archivos=excluye_archivos, 
                                                     tipo_curriculum=tipo_curriculum,
                                                     idioma_respuesta=idioma_respuesta)
        self.logger.info("generate_solicitud_cv: fin. ")
        return Response({"cv_solicitud": cv_text}, status=HTTP_200_OK)
        
    # - Generar CV por solicitud del usuario
    @action(detail=False, methods=['post'])
    def generate_oportunidades_fortalezas(self, request):
        """Genera oportunidades y fortalezas basado en la solicitud del usuario"""
        self.logger.info("generate_oportunidades_fortalezas: Inicio. ")
        solicitud_usuario = request.data.get("solicitud_oportundiades_fortalezas", "")
        idioma_respuesta = request.GET.get("idioma_respuesta", None)
        if not solicitud_usuario:
            return Response({"error": "Falta el parámetro 'solicitud_usuario'"}, status=HTTP_400_BAD_REQUEST)
        
        directorio = request.data.get("directorio", None)
        if not directorio:
            return Response({"error": "Falta 'directorio'"}, status=HTTP_400_BAD_REQUEST)
            
        cv_generator = cvia(dir_personal=directorio)
        of_text = cv_generator.generate_oportunidades_fortalezas(solicitud_usuario, idioma_respuesta=idioma_respuesta)
        self.logger.info("generate_oportunidades_fortalezas: fin. ")
        return Response({"oportunidades_fortalezas": of_text}, status=HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def generate_carta_presentacion(self, request):
        """Genera una carta de presentación"""
        self.logger.info("generate_carta_presentacion: inicio. ")

        # Cargamos el JSON del cuerpo de la petición
        # data = json.loads(request.body)
        data = request.data
        self.logger.info(f"Datos recibidos: {data}")

        directorio = data.get('directorio')
        datosParaCarta = data.get('datosParaCarta') 
        excluye_archivos = data.get('excluye_archivos')
        idioma_respuesta = data.get("idioma_respuesta", None)

        if not directorio:
            return Response({"error": "Falta 'directorio'"}, status=status.HTTP_400_BAD_REQUEST)

        if not datosParaCarta:
            return Response({"error": "Falta 'datosParaCarta'"}, status=status.HTTP_400_BAD_REQUEST)

        cv_generator = cvia(dir_personal=directorio)
        resumen = cv_generator.generate_carta_presentacion(datosParaCarta, excluye_archivos=excluye_archivos,idioma_respuesta=idioma_respuesta)
        self.logger.info("generate_carta_presentacion: fin. ")
        return Response({"carta_presentacion": resumen}, status=HTTP_200_OK)
        
    @action(detail=False, methods=['post'])
    def guarda_archivo_local(self, request):
        """Recibe un archivo y lo envía a la clase `cvia` para almacenarlo"""
        self.logger.info("guarda_archivo_local: inicio. ")
        nombre_directorio = request.data.get("nombre_directorio", None)
        archivo = request.FILES.get("archivo", None)  # Recibe el archivo binario
        datos_json = request.POST.get('datos_cv')
        #datos_cv = json.loads(datos_json) if datos_json else {}
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_cliente = x_forwarded_for.split(',')[0].strip()
        else:
            ip_cliente = request.META.get('REMOTE_ADDR')

        if not nombre_directorio or not archivo:
            return Response({"error": "Faltan parámetros 'nombre_directorio' o 'archivo'."}, status=HTTP_400_BAD_REQUEST)

        # Se delega la tarea a la clase `cvia`
        cvia_instance = cvia(dir_personal=nombre_directorio)
        resultado = cvia_instance.guarda_archivo_local(nombre_directorio, archivo, datos_json, ip_cliente)

        self.logger.info("guarda_archivo_local: fin. ")
        return Response(resultado, status=HTTP_200_OK)
        

    # - Eliminar un archivo de almacenamiento local
    @action(detail=False, methods=['delete'])
    def elimina_archivo_local(self, request):
        """Elimina un archivo en almacenamiento local"""
        nombre_directorio = request.data.get("nombre_directorio", None)
        nombre_archivo = request.data.get("nombre_archivo", None)
        tipo_data = request.data.get("tipo_data", None)

        if not nombre_directorio or not nombre_archivo:
            return Response({"error": "Faltan parámetros 'nombre_directorio' o 'nombre_archivo'."}, status=HTTP_400_BAD_REQUEST)

        cvia_instance = cvia(dir_personal=nombre_directorio)
        cvia_instance.elimina_archivo_local(nombre_directorio, nombre_archivo, tipo_data)
        return Response({"message": f"Archivo '{nombre_archivo}' eliminado de '{nombre_directorio}'."}, status=HTTP_200_OK)

    # - Crear un directorio en almacenamiento local
    @action(detail=False, methods=['post'])
    def crear_directorio_local(self, request):
        """Crea o reemplaza un directorio en almacenamiento local"""
        nombre_directorio = request.data.get("nombre_directorio", None)

        if not nombre_directorio:
            return Response({"error": "Falta el parámetro 'nombre_directorio'."}, status=HTTP_400_BAD_REQUEST)

        cvia_instance = cvia(dir_personal=nombre_directorio)
        cvia_instance.crear_directorio_local(nombre_directorio)
        return Response({"message": f"Directorio '{nombre_directorio}' creado exitosamente."}, status=HTTP_200_OK)

    # - Eliminar un directorio en almacenamiento local
    @action(detail=False, methods=['delete'])
    def eliminar_directorio_local(self, request):
        """Elimina un directorio en almacenamiento local si existe"""
        nombre_directorio = request.data.get("nombre_directorio", None)

        if not nombre_directorio:
            return Response({"error": "Falta el parámetro 'nombre_directorio'."}, status=HTTP_400_BAD_REQUEST)

        cvia_instance = cvia(dir_personal=nombre_directorio)
        cvia_instance.eliminar_directorio_local(nombre_directorio)
        return Response({"message": f"Directorio '{nombre_directorio}' eliminado exitosamente."}, status=HTTP_200_OK)
        
    # - Generar CV por defecto
    @action(detail=False, methods=['get'])
    def prompt_ayuda(self, request):
        """Obtiene los prompt de ayuda"""
        cv_generator = cvia()
        text_ayuda = cv_generator.prompt_ayuda()
        cv_generator = None
        return Response({"prompt_ayuda": text_ayuda}, status=HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='consultar-primer-cv')
    def consultar_primer_cv(self, request):
        """
        Endpoint para obtener los datos del Primer CV de un usuario.
        Uso: GET /candidates/consultar-primer-cv/?usuario=nombre_usuario
        """
        self.logger.info("consultar_primer_cv: Inicio. ")
        nombre_usuario = request.query_params.get('usuario', None)

        if not nombre_usuario:
            self.logger.error(f"El parámetro 'usuario' es obligatorio.")
            return Response(
                {"error": "El parámetro 'usuario' es obligatorio."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cvia_instance = cvia()
            datos = cvia_instance.obtener_datos_primer_cv(nombre_usuario)

            if not datos:
                self.logger.error(f"No se encontró el Primer CV para el usuario '{nombre_usuario}'.")
                return Response(
                    {"message": f"No se encontró el Primer CV para el usuario '{nombre_usuario}'."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            self.logger.info("consultar_primer_cv: Fin. ")
            return Response(datos, status=status.HTTP_200_OK)

        except Exception as e:
            self.logger.error(f"Error interno al consultar el CV: {str(e)}")
            return Response(
                {"error": f"Error interno al consultar el CV: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='consultar-fortalezas-habilidades')
    def consultar_fortalezas_habilidades(self, request):
        """
        Endpoint para obtener el análisis de fortalezas y habilidades.
        Uso: GET /candidates/consultar-fortalezas-habilidades/?usuario=nombre_usuario
        """
        self.logger.info("consultar_fortalezas_habilidades: Inicio. ")
        nombre_usuario = request.query_params.get('usuario', None)

        if not nombre_usuario:
            self.logger.error("El parámetro 'usuario' es obligatorio.")
            return Response(
                {"error": "El parámetro 'usuario' es obligatorio."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cvia_instance = cvia()
            datos = cvia_instance.obtener_fortalezas_habilidades(nombre_usuario)

            if not datos:
                self.logger.error(f"No se encontró análisis de fortalezas para el usuario '{nombre_usuario}'.")
                return Response(
                    {"message": f"No se encontró análisis de fortalezas para el usuario '{nombre_usuario}'."}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            self.logger.info("consultar_fortalezas_habilidades: Fin. ")
            return Response(datos, status=status.HTTP_200_OK)

        except Exception as e:
            self.logger.error(f"Error interno al consultar fortalezas: {str(e)}")
            return Response(
                {"error": f"Error interno al consultar fortalezas: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AuthController:
    @staticmethod
    def login_view(request):
        username = request.POST.get('username')
        password = request.POST.get('password')

        if not username or not password:
            return JsonResponse({"error": "Credenciales incompletas"}, status=400)

        return TokenObtainPairView.as_view()(request)
        
        
import random
import string
import hashlib
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from rest_framework.decorators import api_view

class CaptchaController:
    @staticmethod
    @api_view(['GET'])
    def get_csrf_token(request):
        #return JsonResponse({"csrfToken": get_token(request)})
        print(f"DEBUG: get_csrf_token - Session key: {request.session.session_key}")
        print(f"DEBUG: get_csrf_token - Session data before: {request.session.keys()}")
       
        csrf_token = get_token(request)
        return Response({"csrfToken": csrf_token}, status=HTTP_200_OK)

    @staticmethod
    @api_view(['GET'])
    def generate_captcha(request):
        """Genera una imagen CAPTCHA y almacena su hash en la sesión"""
        
        print(f"DEBUG: generate_captcha - Session key before: {request.session.session_key}")
        print(f"DEBUG: generate_captcha - Session data before: {request.session.keys()}")

        captcha_text = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        captcha_hash = hashlib.sha256(captcha_text.encode()).hexdigest()
        request.session['captcha_hash'] = captcha_hash  # Guardamos el hash seguro en sesión
        
        # Depuración: La sesión fue modificada
        print(f"DEBUG: generate_captcha - captcha_hash set: {captcha_hash}")
        print(f"DEBUG: generate_captcha - Session data after setting: {request.session.keys()}")

        request.session.save()  # 馃敟 IMPORTANTE: Asegura que la sesión se guarda antes de la respuesta
        print(f"DEBUG: generate_captcha - Session saved. Session key after save: {request.session.session_key}") # Debe ser el mismo
        
        # Crear imagen CAPTCHA
        img = Image.new('RGB', (100, 40), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        #font = ImageFont.load_default()  # Mejor usar una fuente TTF para más calidad
        #font = ImageFont.truetype("arial.ttf", 20)  # Cambia "arial.ttf" por tu fuente
        font = ImageFont.truetype("DejaVuSans.ttf", 20)
        draw.text((5, 5), captcha_text, font=font, fill=(65, 0, 0))
        
        # Convertir imagen en respuesta HTTP
        img_io = BytesIO()
        img.save(img_io, format='PNG')
        img_io.seek(0)
        
        return HttpResponse(img_io.getvalue(), content_type="image/png")
        

    @staticmethod
    @api_view(['POST'])
    def validate_captcha(request):
        """Valida si el usuario ingresó el CAPTCHA correctamente"""
        print(f"DEBUG: validate_captcha - Session key: {request.session.session_key}")
        print(f"DEBUG: validate_captcha - Session data: {request.session.keys()}") # 驴Aparece 'captcha_hash' aquí?

        user_captcha = request.data.get("captcha", "").strip()
        
        if not user_captcha:
            return Response({"error": "CAPTCHA requerido"}, status=HTTP_400_BAD_REQUEST)
            
        stored_captcha_hash = request.session.get('captcha_hash')
        
        if not stored_captcha_hash:
            return Response({"error": "No hay CAPTCHA almacenado en sesión"}, status=HTTP_400_BAD_REQUEST)
            
        if hashlib.sha256(user_captcha.encode()).hexdigest() != stored_captcha_hash:
            return Response({"error": "CAPTCHA incorrecto"}, status=HTTP_400_BAD_REQUEST)
            
        return Response({"success": "CAPTCHA validado"}, status=HTTP_200_OK)

class UsuarioView(View):
    def post(self, request):
        """Maneja diferentes acciones según la URL"""
        if request.path == "/usuarios/agregar/":
            return self.agregar_usuario(request)
        elif request.path == "/usuarios/actualizar/":
            return self.actualizar_usuario(request)
        elif request.path == "/usuarios/bloquear/":
            return self.bloquear_usuario(request)
        elif request.path == "/usuarios/suspender/":
            return self.suspender_usuario(request)
        elif request.path == "/usuarios/dar_de_baja/":
            return self.dar_de_baja_usuario(request)
        else:
            return JsonResponse({"error": "Método no soportado"}, status=400)
            
    def get(self, request, *args, **kwargs):
        """Distingue cada acción GET según la URL o parámetros"""
        if "nombre_usuario" in kwargs:
            return self.visualizar_usuario(request, kwargs["nombre_usuario"])
        elif request.path == "/usuarios/todos/":
            return self.listar_usuarios(request)
        else:
            return JsonResponse({"error": "Método no soportado"}, status=400)

    def agregar_usuario(self, request):
        """Crea un nuevo usuario y almacena su contraseña ingresada por el usuario."""
        data = request.POST
        password = data.get("password")

        if not password:
            return JsonResponse({"error": "Debe ingresar una contraseña."}, status=400)

        usuario = Usuarios.objects.create(
            password=password,
            username=data["nombre_usuario"],
            first_name=data["nombres"],
            last_name=data["apellido_paterno"],
            email=data["email1"],
            nombre_usuario=data["nombre_usuario"],
            email1=data["email1"],
            email2=data.get("email2", None),
            apellido_paterno=data["apellido_paterno"],
            apellido_materno=data["apellido_materno"],
            nombres=data["nombres"],
            celular=data["celular"],
            direccion=data["direccion"],
            tipo_documento_identidad=data["tipo_documento_identidad"],
            numero_documento_identidad=data["numero_documento_identidad"],
        )

        # Crear y almacenar la contraseña con hashing seguro
        usuario_password = UsuariosPasswords(usuario=usuario)
        usuario_password.establecer_password(password)

        return JsonResponse({"mensaje": "Usuario creado con éxito"}, status=201)

    def actualizar_usuario(self, request, nombre_usuario):
        """Actualiza los datos de un usuario, excepto su nombre de usuario y fecha de creación."""
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        data = request.POST

        usuario.username=data["nombre_usuario"],
        usuario.first_name=data["nombres"],
        usuario.last_name=data["apellido_paterno"],
        usuario.email=data["email1"],

        usuario.email1 = data["email1"]
        usuario.email2 = data.get("email2", usuario.email2)
        usuario.apellido_paterno = data["apellido_paterno"]
        usuario.apellido_materno = data["apellido_materno"]
        usuario.nombres = data["nombres"]
        usuario.celular = data["celular"]
        usuario.direccion = data["direccion"]
        usuario.tipo_documento_identidad = data["tipo_documento_identidad"]
        usuario.numero_documento_identidad = data["numero_documento_identidad"]

        usuario.save()
        return JsonResponse({"mensaje": "Usuario actualizado con éxito"}, status=200)

    def bloquear_usuario(self, request, nombre_usuario):
        """Bloquea temporalmente a un usuario."""
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        usuario.situacion = '2'  # Código de situación para Bloqueado
        usuario.save()
        return JsonResponse({"mensaje": "Usuario bloqueado"}, status=200)

    def suspender_usuario(self, request, nombre_usuario):
        """Suspende temporalmente a un usuario."""
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        usuario.situacion = '3'  # Código de situación para Suspendido
        usuario.save()
        return JsonResponse({"mensaje": "Usuario suspendido"}, status=200)

    def dar_de_baja_usuario(self, request, nombre_usuario):
        """Marca a un usuario como inactivo y registra la fecha de baja. Tambi茅n inactiva su contraseña."""
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        usuario.estado = '2'  # Código de estado para Inactivo
        usuario.situacion = '4'  # Código de situación para Baja
        usuario.fecha_baja = now()
        usuario.save()

        # Inactivar la contraseña del usuario
        UsuariosPasswords.objects.filter(usuario=usuario).update(estado='2')

        return JsonResponse({"mensaje": "Usuario y su contraseña han sido dados de baja"}, status=200)

    def visualizar_usuario(self, request, nombre_usuario):
        """Obtiene y retorna los datos de un usuario."""
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        data = {
            "nombre_usuario": usuario.nombre_usuario,
            "email1": usuario.email1,
            "email2": usuario.email2,
            "apellido_paterno": usuario.apellido_paterno,
            "apellido_materno": usuario.apellido_materno,
            "nombres": usuario.nombres,
            "celular": usuario.celular,
            "direccion": usuario.direccion,
            "tipo_documento_identidad": usuario.tipo_documento_identidad,
            "numero_documento_identidad": usuario.numero_documento_identidad,
            "estado": usuario.estado,
            "situacion": usuario.situacion,
            "fecha_creacion": usuario.fecha_creacion,
            "fecha_actualizacion": usuario.fecha_actualizacion,
            "fecha_baja": usuario.fecha_baja,
        }
        return JsonResponse(data, status=200)

class UsuarioAPIView(APIView):
    def post(self, request, *args, **kwargs):
        action = kwargs.get("action")
        if action == "agregar":
            return self.agregar_usuario(request)
        elif action == "validar-login":
            return self.validar_login(request)
        else:
            return Response({"error": "Método no soportado"}, status=HTTP_400_BAD_REQUEST)

    def get(self, request, *args, **kwargs):
        action = kwargs.get("action")
        if action == "visualizar" and "nombre_usuario" in kwargs:
            return self.visualizar_usuario(request, kwargs["nombre_usuario"])
        else:
            return Response({"error": "Método no soportado"}, status=HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        """Se agrega el método PUT para actualizar usuarios."""
        action = kwargs.get("action")
        if action == "actualizar":
            return self.actualizar_usuario(request)
        elif action == "cambiar_contrasena":
            return self.cambiar_contrasena(request)
        elif action == "bloquear":
            return self.bloquear_usuario(request)
        elif action == "suspender":
            return self.suspender_usuario(request)
        elif action == "dar_de_baja":
            return self.dar_de_baja_usuario(request)
        else:
            return Response({"error": "Método no soportado"}, status=HTTP_400_BAD_REQUEST)
            
    def validar_login(self, request):
        """Valida usuario y contraseña, ignorando mayúsculas en el usuario."""
        nombre_usuario = request.data.get("nombre_usuario", "").strip().lower()
        password = request.data.get("password", "").strip()

        if not nombre_usuario or not password:
            return Response({"resultado": False, "mensaje": "Debe proporcionar usuario y contraseña."}, status=HTTP_400_BAD_REQUEST)

        usuario = Usuarios.objects.filter(nombre_usuario__iexact=nombre_usuario).first()
        if not usuario:
            return Response({"resultado": False, "mensaje": "Usuario no encontrado."}, status=HTTP_404_NOT_FOUND)

        usuario_password = UsuariosPasswords.objects.filter(usuario=usuario, estado="1").first()
        if not usuario_password:
            return Response({"resultado": False, "mensaje": "Contraseña no encontrada o inactiva."}, status=HTTP_404_NOT_FOUND)

        hash_prueba = pbkdf2_hmac("sha256", password.encode(), usuario_password.salt.encode(), 100000).hex()
        valido = hash_prueba == usuario_password.password_hash
        
        mensaje = ""
        if valido:
            mensaje = "Acceso exitoso"
        else:
            mensaje = "Credenciales incorrectas"

        return Response({"resultado": valido, "mensaje": mensaje}, status=HTTP_200_OK)

    def agregar_usuario(self, request):
        """Crea un nuevo usuario manejando posibles errores de duplicación."""
        data = request.data
        password = data.get("password")

        if not password:
            return Response({"error": "Debe ingresar una contraseña."}, status=HTTP_400_BAD_REQUEST)

        try:
            usuario = Usuarios.objects.filter(nombre_usuario=data["nombre_usuario"]).first()
            if usuario:
                created = False
            else:
                usuario = Usuarios.objects.create_user(
                    nombre_usuario=data["nombre_usuario"],
                    username=data["nombre_usuario"],
                    first_name=data["nombres"],
                    last_name=data["apellido_paterno"],
                    email=data["email1"],
                    email1=data["email1"],
                    email2=data.get("email2", None),
                    apellido_paterno=data["apellido_paterno"],
                    apellido_materno=data["apellido_materno"],
                    nombres=data["nombres"],
                    celular=data["celular"],
                    direccion=data["direccion"],
                    tipo_documento_identidad=data["tipo_documento_identidad"],
                    numero_documento_identidad=data["numero_documento_identidad"],
                    password=password  # aquí se hashea automáticamente
                )
                created = True

            if not created:
                return Response({"error": "El usuario ya existe."}, status=HTTP_400_BAD_REQUEST)

            # Crear y almacenar la contraseña con hashing seguro
            usuario_password = UsuariosPasswords(usuario=usuario)
            usuario_password.establecer_password(password)

            return Response({"mensaje": "Usuario creado con éxito"}, status=HTTP_201_CREATED)

        except IntegrityError:
            return Response({"error": "Error de integridad al crear el usuario."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    def actualizar_usuario(self, request):
        """Actualiza los datos de un usuario, excepto su nombre y fecha de creación."""
        nombre_usuario = request.data.get("nombre_usuario")
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        
        data = request.data
        usuario.username=data["nombre_usuario"],
        usuario.first_name=data["nombres"],
        usuario.last_name=data["apellido_paterno"],
        usuario.email=data["email1"],
        usuario.email1 = data["email1"]
        usuario.email2 = data.get("email2", usuario.email2)
        usuario.apellido_paterno = data["apellido_paterno"]
        usuario.apellido_materno = data["apellido_materno"]
        usuario.nombres = data["nombres"]
        usuario.celular = data["celular"]
        usuario.direccion = data["direccion"]
        usuario.tipo_documento_identidad = data["tipo_documento_identidad"]
        usuario.numero_documento_identidad = data["numero_documento_identidad"]
        usuario.save()

        return Response({"mensaje": "Usuario actualizado con éxito"}, status=HTTP_200_OK)
        
    def cambiar_contrasena(self, request):
        """Cambia la contrasena del usuario."""
        # nombre_usuario = request.data.get("nombre_usuario")
        
        data = request.data
        nombre_usuario = data.get("nombre_usuario")
        password = data.get("password")
        
        if not password:
            return Response({"error": "Debe ingresar una contraseña."}, status=HTTP_400_BAD_REQUEST)
        
        try:
            usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
            
            if not usuario:
                return Response({"error": "El usuario NO existe."}, status=HTTP_400_BAD_REQUEST)
            
            # Crear y almacenar la contraseña con hashing seguro
            usuario_password = UsuariosPasswords(usuario=usuario)
            usuario_password.establecer_password(password)
            
            return Response({"mensaje": "Contraseña cambiada con éxito"}, status=HTTP_200_OK)
        
        except IntegrityError:
            return Response({"error": "Error de integridad al crear la contraseña."}, status=HTTP_500_INTERNAL_SERVER_ERROR)

    def bloquear_usuario(self, request):
        """Bloquea temporalmente a un usuario."""
        nombre_usuario = request.data.get("nombre_usuario")
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        usuario.situacion = '2'  # Código de situación para Bloqueado
        usuario.save()
        return Response({"mensaje": "Usuario bloqueado"}, status=HTTP_200_OK)

    def suspender_usuario(self, request):
        """Suspende temporalmente a un usuario."""
        nombre_usuario = request.data.get("nombre_usuario")
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        usuario.situacion = '3'  # Código de situación para Suspendido
        usuario.save()
        return Response({"mensaje": "Usuario suspendido"}, status=HTTP_200_OK)

    def dar_de_baja_usuario(self, request):
        """Marca a un usuario como inactivo y registra la fecha de baja."""
        nombre_usuario = request.data.get("nombre_usuario")
        usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        usuario.estado = '2'  # Código de estado para Inactivo
        usuario.situacion = '4'  # Código de situación para Baja
        usuario.fecha_baja = now()
        usuario.save()
        UsuariosPasswords.objects.filter(usuario=usuario, estado='1').update(estado='2', fecha_actualizacion = now())
        return Response({"mensaje": "Usuario y su contraseña han sido dados de baja"}, status=HTTP_200_OK)

    def visualizar_usuario(self, request, nombre_usuario):
        """Obtiene y retorna los datos de un usuario."""
        #usuario = get_object_or_404(Usuarios, nombre_usuario=nombre_usuario)
        
        """Obtiene y retorna los datos de un usuario sin importar mayúsculas/minúsculas."""
        usuario = get_object_or_404(Usuarios, nombre_usuario__iexact=nombre_usuario, estado = '1')  # ← Hace que la búsqueda no sea sensible a mayúsculas/minúsculas
                
        data = {
            "nombre_usuario": usuario.nombre_usuario,
            "email1": usuario.email1,
            "email2": usuario.email2,
            "apellido_paterno": usuario.apellido_paterno,
            "apellido_materno": usuario.apellido_materno,
            "nombres": usuario.nombres,
            "celular": usuario.celular,
            "direccion": usuario.direccion,
            "tipo_documento_identidad": usuario.tipo_documento_identidad,
            "numero_documento_identidad": usuario.numero_documento_identidad,
            "estado": usuario.estado,
            "situacion": usuario.situacion,
            "fecha_creacion": usuario.fecha_creacion,
            "fecha_actualizacion": usuario.fecha_actualizacion,
            "fecha_baja": usuario.fecha_baja,
        }
        return Response(data, status=HTTP_200_OK)

