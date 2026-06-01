from ...utils.adm_fuentes_docs.file_reader import JPGReader, PNGReader, PDFReader, WordReader, OCRReader, Word_OCRReader, YAMLReader
from ...rag.rag_engine import RAGEngine
from ...utils.adm_fuentes_docs.file_pickle import PickleManager
#from langchain_core.documents import Document
import os
#import json
import logging

class FileReaderFactory:
    """Fábrica para crear instancias de FileReader según el tipo de archivo."""
    
    readers = {
        "jpg": JPGReader,
        "png": PNGReader,
        "pdf": PDFReader,
        "docx": WordReader,
        "ocr":OCRReader,
        "docx_ocr":Word_OCRReader,
        "yaml":YAMLReader
    }

    def __init__(self, documentos_pkl, docs_metadata_pkl, ver_arch_md_pkl):
        self.documentos_pkl = documentos_pkl
        self.docs_metadata_pkl = docs_metadata_pkl
        self.ver_arch_md_pkl = ver_arch_md_pkl
        self.logger = logging.getLogger(__name__)
        
    #@staticmethod
    def get_reader(self, file_path, file_type):
        reader_class = FileReaderFactory.readers.get(file_type.lower())
        if reader_class:
            if file_type in ('ocr','docx_ocr'):
                return reader_class(file_path,idioma="es", uso_gpu=False)
            else:
                return reader_class(file_path)
        else:
            raise ValueError(f"Formato {file_type} no soportado aún")

    def concatenate_fields(self, fuente_data, fields=None):
        
        return [
            " ".join(
                str(value).strip()
                for value in (
                    data.values() if fields is None else (data.get(field, '') for field in fields)
                )
                if str(value).strip()
            )
            for data in fuente_data if isinstance(data, dict)  # Aseguramos que 'data' sea un diccionario
        ]

    def leer_archivo(self,directorio, archivo):
        doc = None
        fuente_data = None
        conca_fuente_data = None
        file_path = os.path.join(directorio, archivo)
        # Verificar si es un archivo
        if os.path.isfile(file_path):
            # Identificar la extensión del archivo
            extension = os.path.splitext(archivo)[1].lower()
            
            # Llamar a la función correspondiente según la extensión
            if extension == ".pdf":
                #ruta_pdf = file_path
                #fuente_data=leer_pdf_como_imagen_paddleocr(ruta_pdf, idioma='es')
                file_type = 'ocr'
                fuente_data = self.get_reader(file_path, file_type)
                fuente_data = fuente_data.leer()
            elif extension == ".docx":
                ruta_doc = file_path
                ruta_pdf = f'{ruta_doc.split(".")[0]}.pdf' 
                #convert_docx_to_pdf(ruta_doc, ruta_pdf)
                #fuente_data = leer_pdf_como_imagen_paddleocr(ruta_pdf, idioma="es") #idioma='es' español, 'en' ingles
                file_type = 'docx_ocr'
                fuente_data = self.get_reader(file_path, file_type)
                fuente_data = fuente_data.leer()
            elif extension == ".jpg" or extension == ".png":
                #ruta_imagen = file_path  # Ruta a la imagen
                #fuente_data = extraer_texto_de_imagen_paddleocr(ruta_imagen=ruta_imagen, idioma="es")
                file_type = 'ocr'
                fuente_data = self.get_reader(file_path, file_type)
                fuente_data = fuente_data.leer()
            else:
                print(f"Extensión no reconocida: {extension}, archivo: {file_path}")
    
            # Convertimos los documentos fuentes a objetos Document
            conca_fuente_data = self.concatenate_fields(fuente_data)
            #categoria, tipo = self.clasifica_documento(conca_fuente_data, prompt_config, modelo_llm)
            #pages = fuente_data
            #doc = self.construye_langchain_document(fuente_data, categoria, tipo, archivo)
    
        return {archivo:(conca_fuente_data, fuente_data)}
    
    # Lee las diferentes fuentes desde una carpeta o directorio
    def leer_documentos(self, directorio):
        # Diccionario para almacenar el texto extraído
        documents = []
    
        # Verificar si el directorio existe
        if not os.path.exists(directorio):
            print("El directorio no existe.")
            return documents
    
        # Iterar sobre los archivos en el directorio
        for archivo in os.listdir(directorio):
            doc = self.leer_archivo(directorio, archivo)
            doc_val = any(
                any(v is not None for v in value) if isinstance(value, (list, tuple)) else value is not None
                for value in doc.values()
            )
            if doc_val:
                documents.append(doc)
    
        return documents
        
    # Lee las diferentes fuentes desde una carpeta o directorio
    def obtener_archivos(self, directorio):
        archivos = []
    
        # Verificar si el directorio existe
        if not os.path.exists(directorio):
            print("El directorio no existe.")
            return archivos
    
        archivos = os.listdir(directorio)
        archivos_con_ruta = [os.path.join(directorio, archivo) for archivo in archivos]

        return archivos_con_ruta

    # Lee una fuente desde una carpeta o directorio y su archivo y serializarlo en pickle
    def serializar_documento(self, archivo, doc, tipo="doc"):
        #doc = self.leer_archivo(directorio, archivo)
        self.logger.info("serializar_documento: inicio ")
        doc_val = any(
            any(v is not None for v in value) if isinstance(value, (list, tuple)) else value is not None
            for value in doc.values()
        )
        if doc_val:
            doc_pkl = None
            cambio = ''
            if tipo == 'doc':
                doc_pkl = self.documentos_pkl
                cambio = "si"
            else:
                doc_pkl = self.docs_metadata_pkl
                cambio = "no"
                
            # Crear una instancia del gestor
            #gestor = PickleManager(archivo_pkl="documentos.pkl")
            #gestor = PickleManager(archivo_pkl=self.documentos_pkl)
            gestor = PickleManager(archivo_pkl=doc_pkl)
            
            # Agregar datos
            gestor.agregar_dato(archivo, doc[archivo])
            del gestor
            # Crear una instancia del gestor para guardar archivo de verificación de metadata
            #gestor = PickleManager(archivo_pkl="ver_arch_md.pkl")
            gestor = PickleManager(archivo_pkl=self.ver_arch_md_pkl)
            
            # Agregar datos
            gestor.agregar_dato("cambio", cambio)
            del gestor
            self.logger.info("serializar_documento: fin ")
            return doc
        
        self.logger.info("serializar_documento: fin ")
        return ""
                
    # Eliminar documento serializado en pickle
    def eliminar_documento_serializado(self, archivo, tipo="doc"):
        self.logger.info("eliminar_documento_serializado: inicio ")
        doc_pkl = None
        if tipo == 'doc':
            doc_pkl = self.documentos_pkl
        else:
            doc_pkl = self.docs_metadata_pkl

        # Crear una instancia del gestor
        #gestor = PickleManager(archivo_pkl="documentos.pkl")
        #gestor = PickleManager(archivo_pkl=self.documentos_pkl)
        gestor = PickleManager(archivo_pkl=doc_pkl)

        # Agregar datos
        gestor.eliminar_dato(archivo, tipo)
        del gestor
        self.logger.info("eliminar_documento_serializado: fin ")
        
    # Mostrar documento serializado en pickle en pantalla
    def mostrar_documentos_serializados(self):
        self.logger.info("mostrar_documentos_serializados: inicio ")
        # Crear una instancia del gestor
        #gestor = PickleManager(archivo_pkl="documentos.pkl")
        gestor = PickleManager(archivo_pkl=self.documentos_pkl)
        #gestor = PickleManager(archivo_pkl=self.docs_metadata_pkl)

        # Agregar datos
        gestor.mostrar_datos()
        del gestor
        self.logger.info("mostrar_documentos_serializados: fin ")

    # Leer documento serializado en pickle 
    def leer_documentos_serializados(self):
        self.logger.info("leer_documentos_serializados: inicio ")
        # Diccionario para almacenar el texto extraído
        documents = []
        # Crear una instancia del gestor
        #gestor = PickleManager(archivo_pkl="documentos.pkl")
        gestor = PickleManager(archivo_pkl=self.documentos_pkl)

        # Agregar datos
        documentos = gestor.cargar_datos()
        del gestor
        documents = [{archivo:doc} for archivo, doc in documentos.items()]
        del documentos
        self.logger.info("leer_documentos_serializados: fin ")
        return documents

    #def leer_documentos(self, directorio):
    #    # Diccionario para almacenar el texto extraído
    #    documents = []
    #
    #    # Verificar si el directorio existe
    #    if not os.path.exists(directorio):
    #        print("El directorio no existe.")
    #        return documents
    #
    #    # Iterar sobre los archivos en el directorio
    #    for archivo in os.listdir(directorio):
    #        doc = self.leer_archivo(directorio, archivo)
    #        doc_val = any(
    #            any(v is not None for v in value) if isinstance(value, (list, tuple)) else value is not None
    #            for value in doc.values()
    #        )
    #        if doc_val:
    #            documents.append(doc)
    #
    #    return documents