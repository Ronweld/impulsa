from .base_agent import BaseAgent
import json
import logging
import inspect

#class EvaluationAgent(BaseAgent):
#    logger = logging.getLogger(__name__)
#
#    def evaluate_answer(self, question, answer):
#        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
#        prompt = f"""
#        Pregunta:
#        {question}
#
#        Respuesta:
#        {answer}
#
#        Evalúa:
#        - profundidad técnica
#        - claridad
#        - uso de estándares
#        """
#        respuesta = self.run(prompt)
#
#        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
#        return respuesta
    

class EvaluationAgent(BaseAgent):
    logger = logging.getLogger(__name__)

    def evaluate_answer(self, question, answer):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        prompt = f"""
        Pregunta:
        {question}

        Respuesta:
        {answer}

        Evalúa:
        - profundidad técnica
        - claridad
        - uso de estándares

        La salida en formato JSON **válido**, sin texto adicional ni bloques de código, con las siguientes claves:
        - evaluation: La evaluación completa en texto, tal cual la redactarías normalmente.
        - technical: número flotante con el puntaje técnico, en una escala porcentual de 0 a 100.
        - communication: número flotante con el puntaje de comunicación, en una escala porcentual de 0 a 100.
        - overall: número flotante con el puntaje global, en una escala porcentual de 0 a 100.
        """

        data = self.run(prompt)

        try:
            response = json.loads(data)
            
        except json.JSONDecodeError:
            response = {
                "evaluation": data,
                "technical": None,
                "communication": None,
                "overall": None
            }

        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        return response