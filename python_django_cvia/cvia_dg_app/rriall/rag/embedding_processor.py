from sentence_transformers import SentenceTransformer
import numpy as np
import logging

class EmbeddingProcessor:
    """Clase para el manejo de embeddings y recuperación de información relevante."""
    _model_instance = None  # Variable para guardar el modelo único

    def __init__(self, embedding_model_name="all-MiniLM-L6-v2"):
        if EmbeddingProcessor._model_instance is None:
            self.logger.info("Cargando modelo de IA por primera vez...")
            #from sentence_transformers import SentenceTransformer
            EmbeddingProcessor._model_instance = SentenceTransformer(embedding_model_name)
        
        self.embedding_model = EmbeddingProcessor._model_instance

    def embed_text(self, text):
        """Convierte un texto en su representación de embedding."""
        return self.embedding_model.encode(text)

    def retrieve_relevant_data(self, document_texts, query):
        """Encuentra el documento más relevante para la consulta usando embeddings."""
        query_embedding = self.embed_text(query)
        doc_embeddings = np.array([self.embed_text(txt) for txt in document_texts])
        similarities = np.dot(doc_embeddings, query_embedding)
        most_relevant_idx = np.argmax(similarities)
        return document_texts[most_relevant_idx]
