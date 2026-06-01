from ...rag.rag_engine import RAGEngine
import json
from typing import List
from langchain_core.documents import Document
import re
import logging

class ProcesarMetadata:
    """Clase que maneja la identificación del candidato y la extracción de metadatos."""
    
    def __init__(self, rag: RAGEngine):
        self.logger = logging.getLogger(__name__)
        self.rag = rag

    def extraer_json(self, texto):
        # Patrón para JSON dentro de delimitadores de código
        patron_json_delimitado = r"```json\n([\s\S]*?)\n```"
        coincidencia_json_delimitado = re.search(patron_json_delimitado, texto)
        
        # Patrón para JSON escrito directamente en el texto (maneja comillas simples y dobles)
        patron_json_directo = r"\{[\s\S]*?\}"
        coincidencia_json_directo = re.search(patron_json_directo, texto)
        
        # Intentar extraer y convertir JSON
        if coincidencia_json_delimitado:
            return json.loads(coincidencia_json_delimitado.group(1))
        elif coincidencia_json_directo:
            # Reemplazar comillas simples por dobles antes de cargar
            texto_json = coincidencia_json_directo.group(0).replace("'", '"')
            return json.loads(texto_json)
        
        return None

    def extraer_lista_principal(self, texto):
        # Buscar la primera lista JSON completa dentro del texto
        texto = texto.replace("```json", "").replace("```", "").strip()
        inicio = texto.find("[")
        # Encontrar el último cierre de lista `]` desde el final del texto
        fin = texto.rfind("]") + 1  # rfind() busca desde el final
    
        if inicio != -1 and fin != -1:
            json_texto = texto[inicio:fin]
    
            try:
                # Convertir la cadena en una lista de Python
                return json.loads(json_texto)
            except json.JSONDecodeError as e:
                print("Error al decodificar JSON:", e)
                print("Contenido extraído:", json_texto)
                return []
    
        return []
    
    def identifica_candidado(self, prompt_sistema: str, prompt_usuario: str, delimitador: str, documentos: List[str]) -> str:
        """Identifica el nombre del candidato a partir de los documentos."""
        self.logger.info("identifica_candidado: inicio ")
        prompt_sistema = prompt_sistema.format(delimitador=delimitador)
        prompt_usuario = prompt_usuario.format(delimitador=delimitador, query=documentos)
        msg = self.rag.generacion(prompt_sistema, prompt_usuario)
        listas_candidato = self.extraer_candidatos(msg)
        self.logger.info("identifica_candidado: fin ")
        return self.get_nombre_candidato(listas_candidato)
    
    def genera_metadata(self, documentos: List[str], prompt_sis: str, prompt_usr: str, nombre_candidato: str, delimitador: str) -> List[dict]:
        """Genera metadata de cada documento asociado al candidato."""
        self.logger.info("genera_metadata: inicio ")
        documents = []
        
        delimitador_titular = "%%%"
        for doc in documentos:
            prompt_sistema = prompt_sis.format(
                delimitador=delimitador, 
                delimitador_titular=delimitador_titular
            )
            prompt_usuario = prompt_usr.format(
                delimitador=delimitador, 
                query=doc, 
                delimitador_titular=delimitador_titular,
                nombre_candidato=nombre_candidato
            )

            msg = self.rag.generacion(prompt_sistema, prompt_usuario)
            listas_titular = self.extraer_titular_metadata(msg)

            for item in listas_titular:
                doc_meta = self.crear_documento_langchain(doc, nombre_candidato, item["titular"])
                documents.append(doc_meta)
        self.logger.info("genera_metadata: fin ")
        return documents
    
    def extraer_candidatos(self, msg: str) -> List[dict]:
        """Extrae la lista de candidatos desde el mensaje de IA."""
        return self.extraer_lista_principal(msg)

    def get_nombre_candidato(self, listas_candidato: List[dict]) -> str:
        """Devuelve el nombre del primer candidato encontrado."""
        self.logger.info("get_nombre_candidato: inicio ")
        nombre_candidato = ''
        for elemento in listas_candidato:
            if "candidato" in elemento:
                for candidato in elemento["candidato"]:
                    nombre_candidato = candidato['nombre']
                    break

        self.logger.info("get_nombre_candidato: fin ")
        return nombre_candidato
    
    def extraer_titular_metadata(self, msg: str) -> List[dict]:
        """Extrae la lista de titulares desde el mensaje de IA."""
        return self.extraer_lista_principal(f"""[{msg}]""")

    def langchain_document(self, documento, nombre_titular='',es_titular=''):
        self.logger.info("langchain_document: inicio ")
        if es_titular == '' or es_titular == 'NO':
            nombre_titular = ''
        
        # Crear un único documento con la metadata consolidada
        doc = Document(
            page_content=documento.page_content,
            metadata={
                "categoria": documento.metadata['categoria'],
                "tipo": documento.metadata['tipo'],
                "source": documento.metadata['source'],
                "total_pages": documento.metadata['total_pages'],  # Se mantiene el número total de páginas
                "titular":nombre_titular,
                "es_titular": es_titular
            }
        )

        self.logger.info("langchain_document: fin ")
        return doc

    def crear_documento_langchain(self, doc: str, nombre_titular: str, es_titular: bool) -> dict:
        """Crea un documento estructurado con la metadata extraída."""
        return self.langchain_document(doc, nombre_titular=nombre_titular, es_titular=es_titular)

    def clasificar_documentos(self, documentos: List[str], prompt_sis: str, prompt_usr: str, delimitador: str) -> List[dict]:
        """Extrae la metadata de cada documento asociado al candidato."""
        self.logger.info("langchain_document: inicio ")
        documents = []

        for fuentes in documentos:
            for archivo, doc in fuentes.items(): 
                categoria, tipo = self.__clasifica_documento(doc[0], prompt_sis, prompt_usr, delimitador)
                doc_clf = self.construye_langchain_document(doc[1], categoria, tipo, archivo, nombre_titular='',es_titular='')
                documents.append(doc_clf)

        self.logger.info("langchain_document: fin ")
        return documents

    
    def __clasifica_documento(self, fuente_data: str, prompt_sis: str, prompt_usr: str, delimitador: str):
        self.logger.info("__clasifica_documento: inicio ")
    
        #delimitador = '####'
        prompt_sistema = prompt_sis.format(delimitador=delimitador)
        prompt_usuario = prompt_usr.format(
                        delimitador=delimitador, 
                        query=fuente_data
        )

        msg = self.rag.generacion(prompt_sistema, prompt_usuario)
        msg = self.extraer_json(msg)
        tipo_tup = ()
        categoria = ''
        tipo = ''
        if msg is not None and isinstance(msg, dict):
            tipo_tup = next(((k, v) for k, v in msg.items() if isinstance(v, str) and v.strip().lower() != "vacío" and v.strip()), None)
            if tipo_tup:
                categoria = tipo_tup[0]
                tipo = tipo_tup[1]
    
        self.logger.info("__clasifica_documento: fin ")
        return categoria, tipo 

    def construye_langchain_document(self, pages, categoria, tipo, archivo, nombre_titular='',es_titular=''):
        self.logger.info("construye_langchain_document: inicio ")
        total_pages = len(pages)  # Número total de páginas
        doc_paginas = "\n".join([content for page in pages for content in page.values()])  # Unir todo el contenido
    
        # Crear un único documento con la metadata consolidada
        doc = Document(
            page_content=doc_paginas,
            metadata={
                "categoria": categoria,
                "tipo": tipo,
                "source": archivo,
                "total_pages": total_pages,  # Se mantiene el número total de páginas
                "titular":nombre_titular,
                "es titular": es_titular
            }
        )
        self.logger.info("construye_langchain_document: fin ")
        return doc
