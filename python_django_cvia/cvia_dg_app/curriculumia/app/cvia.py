from ...rriall.utils.adm_fuentes_docs.file_reader_factory import FileReaderFactory
from ...rriall.utils.adm_fuentes_docs.file_pickle import PickleManager
from ...rriall.utils.adm_fuentes_docs.file_adm import LocalStorage, FileManager
from ...rriall.utils.procesar_documentos.procesar_metadata import ProcesarMetadata
from ...rriall.rag.rag_engine import RAGEngine
from ...models import DatosPrimerCV, Usuarios, FortalezasHabilidades
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
import os
import logging
import json

class cvia(RAGEngine):
    def __init__(self, dir_personal="ronweld@hotmail.com"):
        # Definimos el logger para el módulo
        self.logger = logging.getLogger(__name__)
        super().__init__()
        self.nombre_candidato = None
 
        self.directorio = os.path.dirname(__file__)
        
        self.dir_data = os.path.join(self.directorio, "../data/")
        self.dir_data = os.path.abspath(self.dir_data)
        
        self.docs_metadata_pkl = os.path.join(self.dir_data, f"""{dir_personal}/pkl/docs_metadata.pkl""")
        self.docs_metadata_pkl = os.path.abspath(self.docs_metadata_pkl)
        
        self.documentos_pkl = os.path.join(self.dir_data, f"""{dir_personal}/pkl/documentos.pkl""")
        self.documentos_pkl = os.path.abspath(self.documentos_pkl)
        
        self.ver_arch_md_pkl = os.path.join(self.dir_data, f"""{dir_personal}/pkl/ver_arch_md.pkl""")
        self.ver_arch_md_pkl = os.path.abspath(self.ver_arch_md_pkl)
        
        file_path_prompt = os.path.join(self.directorio, "../template_prompt.yaml")
        file_path_prompt = os.path.abspath(file_path_prompt)
        
        file_type='yaml'
        self.fr = FileReaderFactory(self.documentos_pkl, self.docs_metadata_pkl, self.ver_arch_md_pkl)
        reader = self.fr.get_reader(file_path_prompt, file_type)
        self.prompt_config = reader.leer()
        reader = None
        
    def setNombreCandidato(self, nombre):
        self.nombre_candidato = nombre
        
    def getNombreCandidato(self):
        return self.nombre_candidato
        
    def procesa_documentos(self, ruta_directorio):
        doc_fuentes = self.fr.leer_documentos(self.dir_data + "/" + ruta_directorio + "/")
        #doc_fuentes = self.fr.leer_documentos(ruta_directorio)
        return doc_fuentes
        
    def obtener_archivos(self, directorio):
        return self.fr.obtener_archivos(self.dir_data + "/" + directorio + "/")
        
    def procesa_documento(self, ruta_directorio, archivo):
        doc = self.fr.leer_archivo(directorio, archivo)
        doc_fuentes = self.fr.serializar_documento(archivo, doc,tipo="doc")
        return doc_fuentes
        
    def mostrar_documentos(self):
        self.fr.mostrar_documentos_serializados()
        
    def eliminar_documento(self, archivo, tipo="doc"):
        self.fr.eliminar_documento_serializado(archivo, tipo)
        
    def __procesa_metadata(self, doc_fuentes):
        """
        Procesa la metadata de los documentos. 
        Requiere obligatoriamente que doc_fuentes contenga datos.
        """
        self.logger.info("__procesa_metadata: inicio ")
        # Si no hay fuentes, abortamos inmediatamente.
        if not doc_fuentes:
            self.logger.error("__procesa_metadata: inicio. Error crítico: doc_fuentes está vacío. No se puede procesar metadata.")
            return [] # O podrías lanzar una excepción personalizada: raise ValueError("doc_fuentes es mandatorio")

        # Crear una instancia del gestor
        #gestor = PickleManager(archivo_pkl="docs_metadata.pkl")
        gestor = PickleManager(archivo_pkl=self.docs_metadata_pkl)
        # Cargar archivo de datos con la metadata
        datos = gestor.cargar_datos()
        
        # Crear una instancia del gestor para guardar archivo de verificación de metadata
        #gestor_verif = PickleManager(archivo_pkl="ver_arch_md.pkl")
        gestor_verif = PickleManager(archivo_pkl=self.ver_arch_md_pkl)
        # Cargar archivo de datos de control de metadata
        verif = gestor_verif.seleccionar_dato("cambio")
        
        crear = False
        if not datos:
            crear = True
        else:
            if verif=="si":
                crear = True
            
        docs_meta = []
        if crear:
            rag = RAGEngine()
            pm = ProcesarMetadata(rag)
            
            delimitador = '####'
            prompt_sistema = self.prompt_config['prompt_sistema_clasifica']['entrada']
            prompt_usuario = self.prompt_config['clasificar_tipo_clasifica']['entrada']
            
            docs = pm.clasificar_documentos(doc_fuentes, prompt_sistema, prompt_usuario, delimitador)

            if (self.nombre_candidato == None):
                self.nombre_candidato = pm.identifica_candidado(self.prompt_config['prompt_sistema_identifica_titular']['entrada'], \
                                                    self.prompt_config['extraer_informacion_identifica_titular']['entrada'], delimitador, docs,)
            
            docs_meta = pm.genera_metadata(docs, self.prompt_config['prompt_sistema_metadata_titular']['entrada'], \
                                            self.prompt_config['extraer_informacion_metadata_titular']['entrada'], \
                                            self.nombre_candidato, delimitador)
                                            
            # Agregar datos
            gestor.agregar_dato("metadata", docs_meta)

            gestor_verif.eliminar_dato("cambio","doc")
            gestor_verif.agregar_dato("cambio", "no")
            del rag
            del pm
            
        else:
            docs_meta = datos["metadata"]
            if verif=="":
                gestor_verif.agregar_dato("cambio", "no")

        del gestor
        del gestor_verif
        self.logger.info("__procesa_metadata: fin ")
        return docs_meta

    def __filtra_metadata(self, docs_meta, excluye_archivos):
        filtros = {}
        source = []
        fuente_filtrada = []
        if ((excluye_archivos!=None and len(excluye_archivos)>0)):
            for item in excluye_archivos:
                source.append(item)
                
            filtros = {
                "source": source,
                "es_titular": ['SI']
            }
            
            fuente_filtrada = self.recuperacion_filtro(docs_meta, filtros)
        else:
            es_titular = 'es_titular'
            fuente_filtrada = self.recuperacion_filtro_unico(docs_meta, es_titular,'SI')
            
        return fuente_filtrada

    def generate_resumen_ejecutivo(self, delimitador="####", excluye_archivos = None, idioma_respuesta="Español"):
        self.logger.info("generate_resumen_ejecutivo: inicio ")
        doc_fuentes = self.fr.leer_documentos_serializados()

        # Validación Crítica: Si no hay fuentes, terminamos el proceso
        if not doc_fuentes:
            msg_error = "No existen fuentes disponibles para procesar. El resumen ejecutivo no puede ser generado."
            self.logger.warning(msg_error) # Registramos el evento en el log
            return msg_error          # Retornamos el mensaje para que la UI lo muestre
        
        docs_meta = self.__procesa_metadata(doc_fuentes)
        
        delimitador_titular = '$$$'
        delimitador_idioma = '¡¡¡'
            
        fuente_filtrada = self.__filtra_metadata(docs_meta, excluye_archivos)
            
        prompt_sistema = self.prompt_config['prompt_sistema_resumen_ejecutivo']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular,
                idioma_respuesta = idioma_respuesta
        )
        prompt_usuario = self.prompt_config['extraer_informacion_resumen_ejecutivo']['entrada'].format(
                delimitador=delimitador, 
                query=fuente_filtrada,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )
        resumen_ej = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("generate_resumen_ejecutivo: fin ")
        return resumen_ej
    
    def __clasifica_tipo_cv(self, delimitador = "####", delimitador_titular="$$$", fuente_filtrada=""):
        prompt_sistema = self.prompt_config['prompt_sistema_clasifica_tipo_cv']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular
        )
        prompt_usuario = self.prompt_config['extraer_informacion_clasifica_tipo_cv']['entrada'].format(
                delimitador=delimitador, 
                query=fuente_filtrada,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato
        )
        cv_tipo = self.generacion(prompt_sistema, prompt_usuario)
        rag = RAGEngine()
        pm = ProcesarMetadata(rag)
        cv_tipo = pm.extraer_json(cv_tipo)
        del pm
        del rag
        
        if not cv_tipo or cv_tipo.get("tipo_cv", "vacio")=="vacio":
            return {"tipo_cv", "Curriculum mixto o combinado"}
        else:
            return cv_tipo
    
    def generate_cv_defecto(self, delimitador = "####", excluye_archivos = None, tipo_curriculum=None, idioma_respuesta="Español"):
        self.logger.info("generate_cv_defecto: inicio ")
    
        doc_fuentes = self.fr.leer_documentos_serializados()
        # Validación Crítica: Si no hay fuentes, terminamos el proceso
        if not doc_fuentes:
            msg_error = "No existen fuentes disponibles para procesar. El curriculum no puede ser generado."
            self.logger.warning(msg_error) # Registramos el evento en el log
            return msg_error          # Retornamos el mensaje para que la UI lo muestre
        
        docs_meta = self.__procesa_metadata(doc_fuentes)
        
        delimitador_titular = '$$$'
        delimitador_categoria = '&&&'
        delimitador_idioma = '¡¡¡'
        
        fuente_filtrada = self.__filtra_metadata(docs_meta, excluye_archivos)
        cv_categoria=''
        
        if (tipo_curriculum==None or tipo_curriculum==''):
            cv_categoria = self.__clasifica_tipo_cv(delimitador = delimitador, delimitador_titular=delimitador_titular, fuente_filtrada=fuente_filtrada)
        else:
            cv_categoria = tipo_curriculum
        
        prompt_sistema = self.prompt_config['prompt_sistema_cv']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular,
                delimitador_categoria=delimitador_categoria,
                idioma_respuesta = idioma_respuesta
        )
        prompt_usuario = self.prompt_config['extraer_informacion_cv']['entrada'].format(
                delimitador=delimitador, 
                query=fuente_filtrada,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_categoria=delimitador_categoria,
                nombre_categoria=cv_categoria,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )
        cv = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("generate_cv_defecto: fin ")
        return cv
    
    def generate_cv_requerimiento(self, req_laboral, delimitador = "####", excluye_archivos = None, tipo_curriculum=None, idioma_respuesta="Español"):
        self.logger.info("generate_cv_requerimiento: inicio ")
    
        doc_fuentes = self.fr.leer_documentos_serializados()
        # Validación Crítica: Si no hay fuentes, terminamos el proceso
        if not doc_fuentes:
            msg_error = "No existen fuentes disponibles para procesar. El curriculum no puede ser generado."
            self.logger.warning(msg_error) # Registramos el evento en el log
            return msg_error          # Retornamos el mensaje para que la UI lo muestre
        
        docs_meta = self.__procesa_metadata(doc_fuentes)
    
        delimitador_titular = '$$$'
        delimitador_req_laboral = "&&&"
        delimitador_categoria = '|||'
        delimitador_idioma = '¡¡¡'

        fuente_filtrada = self.__filtra_metadata(docs_meta, excluye_archivos)
        cv_categoria=''
        
        if (tipo_curriculum==None or tipo_curriculum==''):
            cv_categoria = self.__clasifica_tipo_cv(delimitador = delimitador, delimitador_titular=delimitador_titular, fuente_filtrada=fuente_filtrada)
        else:
            cv_categoria = tipo_curriculum
        
        prompt_sistema = self.prompt_config['prompt_sistema_cv_requerimiento_laboral']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular,
                delimitador_req_laboral=delimitador_req_laboral,
                delimitador_categoria=delimitador_categoria,
                idioma_respuesta = idioma_respuesta
        )
        prompt_usuario = self.prompt_config['extraer_informacion_cv_requerimiento_laboral']['entrada'].format(
                delimitador=delimitador, 
                query=fuente_filtrada,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_req_laboral=delimitador_req_laboral,
                req_laboral=req_laboral,
                delimitador_categoria=delimitador_categoria,
                nombre_categoria=cv_categoria,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )
        cv = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("generate_cv_requerimiento: fin ")
        return cv
    
    def generate_solicitud_cv(self, solicitud_usuario, delimitador = "####", excluye_archivos = None, tipo_curriculum=None, idioma_respuesta="Español"):
        self.logger.info("generate_solicitud_cv: inicio ")
        doc_fuentes = self.fr.leer_documentos_serializados()
        # Validación Crítica: Si no hay fuentes, terminamos el proceso
        if not doc_fuentes:
            msg_error = "No existen fuentes disponibles para procesar. El curriculum no puede ser generado."
            self.logger.warning(msg_error) # Registramos el evento en el log
            return msg_error          # Retornamos el mensaje para que la UI lo muestre
        
        docs_meta = self.__procesa_metadata(doc_fuentes)
        
        delimitador_titular = '$$$'
        delimitador_usuario = "&&&"
        delimitador_categoria = '|||'
        delimitador_idioma = '¡¡¡'
        
        fuente_filtrada = self.__filtra_metadata(docs_meta, excluye_archivos)
        cv_categoria=''
        
        if (tipo_curriculum==None or tipo_curriculum==''):
            cv_categoria = self.__clasifica_tipo_cv(delimitador = delimitador, delimitador_titular=delimitador_titular, fuente_filtrada=fuente_filtrada)
        else:
            cv_categoria = tipo_curriculum
        
        prompt_sistema = self.prompt_config['prompt_sistema_solicitud_cv']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular,
                delimitador_usuario=delimitador_usuario,
                delimitador_categoria=delimitador_categoria,
                delimitador_idioma = delimitador_idioma,
        )
        prompt_usuario = self.prompt_config['extraer_informacion_solicitud_cv']['entrada'].format(
                delimitador=delimitador, 
                query=fuente_filtrada,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_usuario=delimitador_usuario,
                solicitud_usuario=solicitud_usuario,
                delimitador_categoria=delimitador_categoria,
                nombre_categoria=cv_categoria,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )
        cv = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("generate_solicitud_cv: fin ")
        return cv
    
    def generate_oportunidades_fortalezas(self, solicitud_usuario, delimitador = "####", idioma_respuesta="Español"):
        self.logger.info("generate_oportunidades_fortalezas: inicio ")
        delimitador_titular = '$$$'
        delimitador_idioma = '¡¡¡'

        prompt_sistema = self.prompt_config['prompt_sistema_oportunidades_fortalezas']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular,
                delimitador_idioma = delimitador_idioma
        )
        prompt_usuario = self.prompt_config['extraer_informacion_oportunidades_fortalezas']['entrada'].format(
                delimitador=delimitador, 
                solicitud_usuario=solicitud_usuario,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )
        cv = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("generate_oportunidades_fortalezas: fin ")
        return cv
        
    def guarda_archivo_local(self, nombre_directorio, archivo, datos_json, ip_cliente):
        """Guarda un archivo en almacenamiento local"""
        self.logger.info(f"guarda_archivo_local: inicio - {archivo}")
        
        local_storage = LocalStorage(base_directory=self.dir_data + "/" + nombre_directorio + "/")
        file_manager_local = FileManager(local_storage)
        file_path = local_storage.base_directory + archivo.name  # 🔥 Define la ruta de almacenamiento

        # 🔥 Guarda el archivo correctamente usando la lógica de `FileManager`
        with archivo.open('rb') as file_data:
            #file_manager_local.save_file(file_path, file_data.read())
            file_manager_local.save_file(file_path, file_data)
            
            #doc_fuentes = self.fr.serializar_documento(nombre_directorio, file_path)
            doc = self.fr.leer_archivo(self.dir_data + "/" + nombre_directorio + "/", archivo.name)
            doc_fuentes = self.fr.serializar_documento(archivo.name, doc, tipo="doc")

        del local_storage
        del file_manager_local

        # convertir string JSON a dict
        tipo_data=''
        if isinstance(datos_json, str):
            tipo_data = json.loads(datos_json).get("tipo_data")

        if tipo_data == 'PRIMERCV':
            self.__guardar_en_bd_primer_cv(nombre_directorio, datos_json, file_path, ip_cliente)
        elif tipo_data == "FORTALEZAS":
            self.__guardar_en_bd_fortalezas(nombre_directorio, datos_json, ip_cliente)

        self.logger.info(f"guarda_archivo_local: fin - {archivo}")
        return {"message": f"Archivo '{archivo.name}' guardado en '{file_path}'."}
        
    def elimina_archivo_local_ant(self, nombre_directorio, nombre_archivo):
        self.logger.info("elimina_archivo_local: inicio ")
        local_storage = LocalStorage(base_directory = self.dir_data+"/"+nombre_directorio+"/")
        file_manager_local = FileManager(local_storage)
        
        file_manager_local.delete_file(nombre_archivo)  # Elimina el archivo
        self.eliminar_documento(nombre_archivo, tipo='doc')
        self.eliminar_documento(nombre_archivo, tipo='meta')
        del local_storage
        del file_manager_local
        self.logger.info("elimina_archivo_local: fin ")

    def elimina_archivo_local(self, nombre_directorio, nombre_archivo=None, tipo_data="PRIMERCV"):
        """
        Elimina registros y archivos asociados de forma atómica.
        tipo_data puede ser: 'PRIMERCV' o 'FORTALEZAS'
        """
        self.logger.info(f"elimina_archivo_local: inicio para tipo {tipo_data} - {nombre_archivo}")
        
        try:
            # Iniciamos transacción para asegurar integridad en BD
            with transaction.atomic():
                # 1. Obtener instancia del usuario
                if  (tipo_data != 'OTROS'):
                    usuario_instancia = Usuarios.objects.get(nombre_usuario=nombre_directorio)

                if tipo_data == 'PRIMERCV':
                    # Borrado lógico/físico en BD para DatosPrimerCV
                    DatosPrimerCV.objects.filter(usuario=usuario_instancia).delete()
                    self.logger.info(f"Registro DatosPrimerCV eliminado para {nombre_directorio}")

                elif tipo_data == 'FORTALEZAS':
                    # Borrado en BD para FortalezasHabilidades
                    FortalezasHabilidades.objects.filter(usuario=usuario_instancia).delete()
                    self.logger.info(f"Registro FortalezasHabilidades eliminado para {nombre_directorio}")
                elif tipo_data == 'OTROS':
                    # Elimina los otros tipos de archivos
                    self.logger.info(f"Para eliminar archivos diferentes de fortalezas y datos del primer CV {nombre_directorio}")
                else:
                    raise ValueError(f"Tipo de dato '{tipo_data}' no es válido para eliminación.")

                # 2. Eliminación de archivos físicos (solo si se proporciona nombre_archivo)
                if nombre_archivo:
                    local_storage = LocalStorage(base_directory=f"{self.dir_data}/{nombre_directorio}/")
                    file_manager_local = FileManager(local_storage)
                    
                    # Eliminar archivo físico
                    file_manager_local.delete_file(nombre_archivo)
                    
                    # Eliminar del motor de búsqueda/memoria (serialización)
                    self.eliminar_documento(nombre_archivo, tipo='doc')
                    self.eliminar_documento(nombre_archivo, tipo='meta')
                    
                    del local_storage
                    del file_manager_local
                    self.logger.info(f"Archivos físicos {nombre_archivo} eliminados con éxito.")

            self.logger.info(f"elimina_archivo_local: fin - {nombre_archivo}")
            return True

        except Usuarios.DoesNotExist:
            self.logger.error(f"Usuario {nombre_directorio} no encontrado.")
            return False
        except Exception as e:
            self.logger.error(f"Error crítico en elimina_archivo_local: {str(e)}")
            # Al estar dentro de transaction.atomic(), cualquier error aquí hace rollback en la BD
            raise e
        
    def crear_directorio_local(self, nombre_directorio):
        self.logger.info("crear_directorio_local: inicio ")
        local_storage = LocalStorage(base_directory = self.dir_data)
        file_manager_local = FileManager(local_storage)
        file_manager_local.manage_directory(nombre_directorio, "create")  # Crea o reemplaza el directorio
        del local_storage
        del file_manager_local
        self.logger.info("crear_directorio_local: fin ")
        
    def eliminar_directorio_local(self, nombre_directorio):
        self.logger.info("eliminar_directorio_local: inicio ")
        local_storage = LocalStorage(base_directory = self.dir_data)
        file_manager_local = FileManager(local_storage)

        file_manager_local.manage_directory(nombre_directorio, "delete")  # Elimina el directorio si existe
        del local_storage
        del file_manager_local
        self.logger.info("eliminar_directorio_local: fin ")
        
    def prompt_ayuda(self):
        self.logger.info("prompt_ayuda: inicio ")
        file_prompt_ayuda = os.path.join(self.directorio, "../template_prompt_ayuda.yaml")
        file_prompt_ayuda = os.path.abspath(file_prompt_ayuda)
        file_type='yaml'
        reader = self.fr.get_reader(file_prompt_ayuda, file_type)
        prompt_ayuda = reader.leer()
        reader = None
        self.logger.info("prompt_ayuda: fin ")
        return prompt_ayuda
        
    def __guardar_en_bd_primer_cv(self, nombre_directorio, datos_json, path_archivo, ip_cliente):
        """
        Método privado para persistir los datos del formulario y la ruta del PDF en la BD.
        """
        self.logger.info("__guardar_en_bd_primer_cv: inicio")
        try:
            # 1. Convertir el JSON a diccionario si viene como string
            if isinstance(datos_json, str):
                datos = json.loads(datos_json)
            else:
                datos = datos_json

            # 2. PROCESAR FECHA: Si es cadena vacía o solo espacios, convertir a None
            fecha_nacimiento = datos.get('fecha_nacimiento')
            if not fecha_nacimiento or str(fecha_nacimiento).strip() == "":
                fecha_nacimiento = "1900-01-01"

            # 3. Obtener la instancia del Usuario
            # Asumimos que nombre_directorio es el nombre_usuario (PK)
            try:
                usuario_instancia = Usuarios.objects.get(nombre_usuario=nombre_directorio)
            except Usuarios.DoesNotExist:
                self.logger.error(f"Usuario {nombre_directorio} no encontrado en la base de datos.")
                return False

            # Intentamos obtener el registro si ya existe   
            registro_existente = DatosPrimerCV.objects.filter(usuario=usuario_instancia).first()

            # Definimos qué IP asignar a cada campo
            if not registro_existente:
                # ES CREACIÓN: Ambas IPs son la misma al inicio
                ip_creacion = ip_cliente
                ip_actualizacion = ip_cliente
            else:
                # ES ACTUALIZACIÓN: Mantenemos la IP de creación original y cambiamos la de actualización
                ip_creacion = registro_existente.ip_creacion
                ip_actualizacion = ip_cliente

            # 4. Mapear y Guardar en DatosPrimerCV
            # Usamos update_or_create por si el usuario está actualizando
            cv_registro, created = DatosPrimerCV.objects.update_or_create(
                usuario=usuario_instancia,
                defaults={
                    'apellido_paterno': datos.get('apellido_paterno'),
                    'apellido_materno': datos.get('apellido_materno'),
                    'nombres': datos.get('nombres'),
                    'email': datos.get('email'),
                    'celular': datos.get('celular'),
                    'fecha_nacimiento': fecha_nacimiento,
                    'profesion': datos.get('profesion'),
                    'objetivo': datos.get('objetivo'),
                    'experiencia': datos.get('experiencia'),
                    'cursos': datos.get('cursos'),
                    'habilidades': datos.get('habilidades'),
                    'ip_creacion': ip_creacion,
                    'ip_actualizacion': ip_actualizacion,
                    'archivo_pdf': path_archivo  # Guardamos la ruta del archivo generado
                }
            )

            accion = "creado" if created else "actualizado"
            self.logger.info(f"__guardar_en_bd_primer_cv: Registro {accion} con éxito para {nombre_directorio}: fin")
            return True

        except Exception as e:
            self.logger.error(f"Error en _guardar_datos_en_bd: {str(e)}")
            return False
        
    def __guardar_en_bd_fortalezas(self, nombre_directorio, datos_json, ip_cliente):
        """
        Método privado para persistir los datos del formulario y la ruta del PDF en la BD.
        """
        self.logger.info("__guardar_en_bd_fortalezas: inicio")
        try:

            # 1. Parsear el JSON
            if isinstance(datos_json, str):
                datos = json.loads(datos_json)
            else:
                datos = datos_json

            # 2. Obtener instancia de Usuario
            try:
                usuario_instancia = Usuarios.objects.get(nombre_usuario=nombre_directorio)
            except Usuarios.DoesNotExist:
                self.logger.error(f"Usuario {nombre_directorio} no encontrado para Fortalezas.")
                return False

            # 3. Determinar IP de creación vs actualización
            registro_existente = FortalezasHabilidades.objects.filter(usuario=usuario_instancia).first()
            
            # Si no existe, la IP de creación es la actual. Si existe, preservamos la original.
            ip_creacion_valor = registro_existente.ip_creacion if registro_existente else ip_cliente

            # 4. Guardar o Actualizar (update_or_create)
            # Nota: Usamos 'adjuntarOF' que es el nombre en tu ngModel de Angular
            fortaleza_reg, created = FortalezasHabilidades.objects.update_or_create(
                usuario=usuario_instancia,
                defaults={
                    'actividades': datos.get('actividades', ''),
                    'adjuntar_al_cv': datos.get('adjuntarOF', False),
                    'ip_creacion': ip_creacion_valor,
                    'ip_actualizacion': ip_cliente
                }
            )

            accion = "creado" if created else "actualizado"
            self.logger.info(f"__guardar_en_bd_fortalezas: Registro {accion} con éxito para {nombre_directorio}: fin")
            return True
        
        except Exception as e:
            self.logger.error(f"Error en __guardar_en_bd_fortalezas: {str(e)}")
            return False

    def obtener_datos_primer_cv(self, nombre_usuario):
        """
        Consulta pública para obtener los datos del CV por el nombre de usuario.
        """
        self.logger.info(f"obtener_datos_primer_cv: consultando usuario {nombre_usuario}. Inicio")
        try:
            # Buscamos el registro usando la relación de la FK con Usuarios
            registro = DatosPrimerCV.objects.get(usuario__nombre_usuario=nombre_usuario)
            
            # Retornamos un diccionario limpio para la View
            datosPrimerCV = {
                "id": registro.id,
                "apellido_paterno": registro.apellido_paterno,
                "apellido_materno": registro.apellido_materno,
                "nombres": registro.nombres,
                "email": registro.email,
                "celular": registro.celular,
                "fecha_nacimiento": registro.fecha_nacimiento.isoformat() if registro.fecha_nacimiento else None,
                "profesion": registro.profesion,
                "objetivo": registro.objetivo,
                "experiencia": registro.experiencia,
                "cursos": registro.cursos,
                "habilidades": registro.habilidades,
                "archivo_pdf": registro.archivo_pdf.url if registro.archivo_pdf else None,
                "fecha_actualizacion": registro.fecha_actualizacion.strftime("%Y-%m-%d %H:%M:%S")
            }
            self.logger.info(f"obtener_datos_primer_cv: consultando usuario {nombre_usuario}. Fin")
            return datosPrimerCV
        except DatosPrimerCV.DoesNotExist:
            self.logger.warning(f"No se encontró CV para el usuario: {nombre_usuario}")
            return None
        except Exception as e:
            self.logger.error(f"Error al consultar DatosPrimerCV: {str(e)}")
            raise e

    def obtener_fortalezas_habilidades(self, nombre_usuario):
        """
        Consulta pública para obtener el análisis de potencial por el nombre de usuario.
        """
        self.logger.info(f"obtener_fortalezas_habilidades: consultando usuario {nombre_usuario}. Inicio.")
        try:
            registro = FortalezasHabilidades.objects.get(usuario__nombre_usuario=nombre_usuario)
            
            datosFortalezas = {
                "id": registro.id,
                "actividades": registro.actividades,
                "adjuntarOF": registro.adjuntar_al_cv, # Mantenemos nombre del frontend
                "fecha_actualizacion": registro.fecha_actualizacion.strftime("%Y-%m-%d %H:%M:%S")
            }
            self.logger.info(f"obtener_fortalezas_habilidades: consultando usuario {nombre_usuario}. Fin.")
            return datosFortalezas
        except FortalezasHabilidades.DoesNotExist:
            self.logger.warning(f"No se encontraron fortalezas para el usuario: {nombre_usuario}")
            return None
        except Exception as e:
            self.logger.error(f"Error al consultar FortalezasHabilidades: {str(e)}")
            raise e
        
    def generate_carta_presentacion(self, datosParaCarta, delimitador="####", excluye_archivos = None, idioma_respuesta="Español"):
        self.logger.info("generate_carta_presentacion: inicio ")
        doc_fuentes = self.fr.leer_documentos_serializados()

        tipo_presentacion = datosParaCarta.get('tipo_presentacion')
        nombre_empresa = datosParaCarta.get('nombre_empresa')
        nombre_persona = datosParaCarta.get('nombre_persona')
        req_laboral = datosParaCarta.get('convocatoriaInput')

        # Validación Crítica: Si no hay fuentes, terminamos el proceso
        if not doc_fuentes:
            msg_error = "No existen fuentes disponibles para procesar. La carta de presentación, no puede ser generado."
            self.logger.warning(msg_error) # Registramos el evento en el log
            return msg_error          # Retornamos el mensaje para que la UI lo muestre
        
        docs_meta = self.__procesa_metadata(doc_fuentes)
        
        delimitador_titular = '$$$'
        delimitador_req_laboral = "&&&"
        delimitador_empresa = "|||"
        delimitador_persona = "???"
        delimitador_idioma = '¡¡¡'
            
        fuente_filtrada = self.__filtra_metadata(docs_meta, excluye_archivos)

        # Verificamos si no se cuenta con información de la persona candidata
        if (self.nombre_candidato == None):
            rag = RAGEngine()
            pm = ProcesarMetadata(rag)
            prompt_sistema = self.prompt_config['prompt_sistema_clasifica']['entrada']
            prompt_usuario = self.prompt_config['clasificar_tipo_clasifica']['entrada']
            
            docs = pm.clasificar_documentos(doc_fuentes, prompt_sistema, prompt_usuario, delimitador)

            self.nombre_candidato = pm.identifica_candidado(self.prompt_config['prompt_sistema_identifica_titular']['entrada'], \
                                                    self.prompt_config['extraer_informacion_identifica_titular']['entrada'], delimitador, docs,)


        if (tipo_presentacion=='PRIMER_EMPLEO'):
            carta = self.__prompt_carta_presentacion_primer_empleo(delimitador, delimitador_titular,
                                               delimitador_empresa, delimitador_persona,
                                               fuente_filtrada, nombre_empresa, nombre_persona,
                                               delimitador_idioma, idioma_respuesta)
        elif (tipo_presentacion=='CON_OFERTA'):
            carta = self.__prompt_carta_presentacion_con_oferta(delimitador, delimitador_req_laboral,
                                               req_laboral, delimitador_titular,
                                               delimitador_empresa, delimitador_persona,
                                               fuente_filtrada, nombre_empresa, nombre_persona,
                                               delimitador_idioma, idioma_respuesta)
            
        elif (tipo_presentacion=='SIN_OFERTA'):
            carta = self.__prompt_carta_presentacion_sin_oferta(delimitador, delimitador_titular,
                                               delimitador_empresa, delimitador_persona,
                                               fuente_filtrada, nombre_empresa, nombre_persona,
                                               delimitador_idioma, idioma_respuesta)

        self.logger.info("generate_carta_presentacion: fin ")
        return carta
    
    def __prompt_carta_presentacion_sin_oferta(self, delimitador, delimitador_titular,
                                               delimitador_empresa, delimitador_persona,
                                               fuente_filtrada, nombre_empresa, nombre_persona,
                                               delimitador_idioma, idioma_respuesta):
        self.logger.info("__prompt_carta_presentacion_sin_oferta: inicio ")
        prompt_sistema = self.prompt_config['prompt_sistema_carta_presentacion_sin_oferta']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular,
                delimitador_empresa=delimitador_empresa,
                delimitador_persona=delimitador_persona,
                idioma_respuesta = idioma_respuesta
        )
        prompt_usuario = self.prompt_config['extraer_carta_presentacion_sin_oferta']['entrada'].format(
                delimitador=delimitador, 
                solicitud_usuario=fuente_filtrada,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_empresa = delimitador_empresa,
                nombre_empresa = nombre_empresa,
                delimitador_persona = delimitador_persona,
                nombre_persona = nombre_persona,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )
        carta = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("__prompt_carta_presentacion_sin_oferta: fin ")
        return carta
    
    def __prompt_carta_presentacion_con_oferta(self, delimitador, delimitador_req_laboral, 
                                               req_laboral, delimitador_titular,
                                               delimitador_empresa, delimitador_persona,
                                               fuente_filtrada, nombre_empresa, nombre_persona,
                                               delimitador_idioma, idioma_respuesta):
        self.logger.info("__prompt_carta_presentacion_con_oferta: inicio ")
        prompt_sistema = self.prompt_config['prompt_sistema_carta_presentacion_con_oferta']['entrada'].format(
                delimitador=delimitador,
                delimitador_req_laboral = delimitador_req_laboral,
                delimitador_titular=delimitador_titular,
                delimitador_empresa=delimitador_empresa,
                delimitador_persona=delimitador_persona,
                idioma_respuesta = idioma_respuesta
        )
        prompt_usuario = self.prompt_config['extraer_carta_presentacion_con_oferta']['entrada'].format(
                delimitador=delimitador, 
                solicitud_usuario=fuente_filtrada,
                delimitador_req_laboral = delimitador_req_laboral,
                req_laboral = req_laboral,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_empresa = delimitador_empresa,
                nombre_empresa = nombre_empresa,
                delimitador_persona = delimitador_persona,
                nombre_persona = nombre_persona,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )
        carta = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("__prompt_carta_presentacion_con_oferta: fin ")
        return carta
    
    def __prompt_carta_presentacion_primer_empleo(self, delimitador, delimitador_titular,
                                               delimitador_empresa, delimitador_persona,
                                               fuente_filtrada, nombre_empresa, nombre_persona,
                                               delimitador_idioma, idioma_respuesta):
        self.logger.info("__prompt_carta_presentacion_primer_empleo: inicio ")
        prompt_sistema = self.prompt_config['prompt_sistema_carta_presentacion_primer_empleo']['entrada'].format(
                delimitador=delimitador,
                delimitador_titular=delimitador_titular,
                delimitador_empresa=delimitador_empresa,
                delimitador_persona=delimitador_persona,
                idioma_respuesta = idioma_respuesta
        )
        prompt_usuario = self.prompt_config['extraer_carta_presentacion_primer_empleo']['entrada'].format(
                delimitador=delimitador, 
                solicitud_usuario=fuente_filtrada,
                delimitador_titular=delimitador_titular,
                nombre_candidato = self.nombre_candidato,
                delimitador_empresa = delimitador_empresa,
                nombre_empresa = nombre_empresa,
                delimitador_persona = delimitador_persona,
                nombre_persona = nombre_persona,
                delimitador_idioma = delimitador_idioma,
                idioma_respuesta = idioma_respuesta
        )

        carta = self.generacion(prompt_sistema, prompt_usuario)
        self.logger.info("__prompt_carta_presentacion_primer_empleo: fin ")
        return carta
    