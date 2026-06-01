from .base_agent import BaseAgent
import json
import logging
import inspect

#class CulturalAgent(BaseAgent):
#    logger = logging.getLogger(__name__)
#
#    def evaluate_culture(self, history):
#        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
#        prompt = f"""
#        Analiza afinidad cultural basado en respuestas:
#
#        {history}
#
#        Devuelve % de afinidad y justificación.
#        """
#        response = self.run(prompt)
#        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
#        return response


class CulturalAgent(BaseAgent):
    logger = logging.getLogger(__name__)

    def evaluate_culture(self, history):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")

        prompt = f"""
        Analiza afinidad cultural basado en respuestas:

        {history}
        Devuelve % de afinidad y justificación.
        La salida en formato JSON **válido**, sin texto adicional ni bloques de código, con las siguientes claves:
        - cultural: el texto completo de la evaluación cultural
        - cultural_affinity_score: número flotante con el porcentaje de afinidad cultural, en una escala porcentual de 0 a 100.
        - cultural_justification: texto breve explicando la evaluación
        """

        data = self.run(prompt)

        try:
            response = json.loads(data)
            
        except json.JSONDecodeError:
            response = {
                "cultural": data,
                "cultural_affinity_score": None,
                "cultural_justification": None
            }

        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        return response
