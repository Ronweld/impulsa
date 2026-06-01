#import together
#import openai
from dotenv import load_dotenv

from ..rag.llm_handler import LLMHandler
from ..rag.embedding_processor import EmbeddingProcessor 
import os

# MODELO_LLM = "meta-llama/Llama-4-Scout-17B-16E-Instruct"
MODELO_LLM="gpt-5.2"
PROVEEDOR = "openai"
MODELO_EMBEDDING = "all-MiniLM-L6-v2"
SERVICE_TIER = 'flex'
TIMEOUT = 300 # 300 Segundos para SERVICE_TIER = 'flex', para standar por defecto 60

class RAGEngine(LLMHandler, EmbeddingProcessor):
    """Motor RAG con herencia múltiple, integrando LLMs y procesamiento de embeddings."""

    #def __init__(self, provider=PROVEEDOR, model=MODELO_LLM, embedding_model=MODELO_EMBEDDING):
    def __init__(self):
        # Cargar variables desde .env 
        load_dotenv()
        self.api_key = os.environ["API_KEY"]
        self.model_llm = MODELO_LLM
        self.provider = PROVEEDOR
        self.embedding_model = MODELO_EMBEDDING
        self.service_tier = SERVICE_TIER
        self.timeout = TIMEOUT
        LLMHandler.__init__(self, self.api_key, self.provider, self.service_tier, self.timeout)
        EmbeddingProcessor.__init__(self, self.embedding_model)
        
    def getModeloLLM(self):
        return self.model_llm
    
    def getService_Tier(self):
        return self.service_tier

    def getTimeOut(self):
        return self.timeout
    
    # Recuperacion
    def recuperacion_filtro_unico(self, documentos, campo_meta, filtro):
        return [doc for doc in documentos if doc.metadata.get(campo_meta) == filtro]
    
    def recuperacion_filtro(self, documentos, filtros):
        """
        Filtra los documentos según múltiples metadatos y múltiples valores de filtro.
        
        :param documentos: Lista de documentos con metadatos.
        :param filtros: Diccionario donde las claves son los nombres de los metadatos y los valores son listas de filtros.
        :return: Lista de documentos que cumplen con al menos uno de los filtros en cada metadato especificado.
        """
        return [
            doc for doc in documentos 
            if not all(doc.metadata.get(campo_meta) in valores for campo_meta, valores in filtros.items())
        ]
    
    def aumentada(self, prompt_sistema, prompt_usuario):
        """Estructura los prompts para ser utilizados en la generación de texto."""
        return {"role": "system", "content": prompt_sistema}, {"role": "user", "content": prompt_usuario}

    def generacion(self, prompt_sistema, prompt_usuario, additional_context="", temperature=0.7):
        """Genera texto con IA, combinando retrieval y generación."""
        system_dict, user_dict = self.aumentada(prompt_sistema, prompt_usuario)

        if additional_context:
            system_dict["content"] += f"\n{additional_context}"
        
        return self.generate_response(self.getModeloLLM(), [system_dict, user_dict], temperature=temperature)
