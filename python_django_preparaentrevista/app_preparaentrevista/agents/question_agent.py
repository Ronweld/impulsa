#from .base_agent import BaseAgent
#
#class QuestionAgent(BaseAgent):
#
#    def generate_questions(self, profile):
#        prompt = f"""
#        Basado en este perfil:
#        {profile}
#        Genera preguntas técnicas, conductuales y escenarios.
#        """
#        return self.run(prompt)
from .base_agent import BaseAgent
import json
import logging
import inspect

class QuestionAgent(BaseAgent):
    logger = logging.getLogger(__name__)

    def generate_questions(self, profile):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        prompt = f"""
        Basado en este perfil:
        {profile}

        Genera una lista de preguntas en formato JSON **válido**.
        Cada elemento debe tener:
        - "order": correlativo por type.
        - "type": uno de "técnicas", "conductuales", "escenarios"]
        - "question": el texto de la pregunta
        Las preguntas deben de mostrarse en el siguiente orden de type: técnicas, conductuales y escenarios.
        El orden dentro de cada type, debe de estar dado por el campo "order".
        El campo "order" debe de empezar en cero.
        El "order" igual a cero debe de significar el título del type.
        Máximo debes de generar 2 pregunta por cada type.

        Ejemplo de salida:
        [{
          {"order":"0","type": "técnicas", "question": "PREGUNTAS TECNICAS"},
          {"order":"1","type": "técnicas", "question": "Explique cómo funciona un índice en SQL"},
          {"order":"2","type": "técnicas", "question": "¿Qué es un closure en Python?"},
          {"order":"3","type": "técnicas", "question": "¿Qué es un Apache Spark?"},
          {"order":"0","type": "conductuales", "question": "PREGUNTAS CONDUCTUALES"},
          {"order":"1","type": "conductuales", "question": "Cuéntame de un conflicto en tu equipo y cómo lo resolviste"},
          {"order":"2","type": "conductuales", "question": "Cuáles son tus fortalezas para liderar un equipo"},
          {"order":"0","type": "escenarios", "question": "PREGUNTAS DE ESCENARIOS"},
          {"order":"1","type": "escenarios", "question": "Imagina que tu servidor se cae en plena demo, ¿qué harías?"},
          {"order":"2","type": "escenarios", "question": "Cómo haces para optimizar Apache Spark"}
        }
        ]

        Devuelve únicamente el JSON, sin comentarios ni texto adicional.
        """

        response = self.run(prompt)

        try:
            questions = json.loads(response)
            #response = json.dumps(response, ensure_ascii=False, indent=2)
            #questions = json.loads(response)
        except Exception:
            # fallback: si no devuelve JSON válido
            #questions = [{"type": "general", "question": q.strip()} 
            #             for q in response.split("\n") if q.strip()]
            questions = [
                {"order": i, "type": "general", "question": q.strip()}
                for i, q in enumerate(response.split("\n"))
                if q.strip()
            ]

        print(f"{questions}") 
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")    
        return questions
