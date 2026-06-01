from .base_agent import BaseAgent
import logging
import inspect

class ReportAgent(BaseAgent):
    logger = logging.getLogger(__name__)

    def generate_report(self, session_summary):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        prompt = f"""
        Genera un reporte final basado en:

        {session_summary}

        Incluye:
        - fortalezas
        - debilidades
        - recomendaciones
        """
        response = self.run(prompt)
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        return response
