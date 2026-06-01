import logging
import inspect

class BaseAgent:

    def __init__(self, agent):
        self.logger = logging.getLogger(__name__)
        self.agent = agent

    def run(self, input_text):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        response = self.agent.invoke({"input": input_text})
        respuesta = response["output"]
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        return respuesta
    
    def run_test(self, input_text):
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: inicio ")
        response = {'output':f'Entrada de {input_text} y su respuesta esta en duro '}#self.agent.invoke({"input": input_text})
        respuesta = response["output"]
        respuesta = [{'order': 0, 'type': 'técnicas', 'question': 'PREGUNTAS TECNICAS'}, {'order': 1, 'type': 'técnicas', 'question': '¿Cómo optimizarías un pipeline de ETL utilizando Apache Spark?'}, {'order': 2, 'type': 'técnicas', 'question': 'Explique la diferencia entre procesamiento batch y streaming en Flink.'}, {'order': 0, 'type': 'conductuales', 'question': 'PREGUNTAS CONDUCTUALES'}, {'order': 1, 'type': 'conductuales', 'question': 'Describe una situación en la que tuviste que liderar un equipo multidisciplinario para resolver un problema técnico.'}, {'order': 2, 'type': 'conductuales', 'question': 'Cuéntame sobre un momento en el que implementaste una mejora continua en un proceso de datos.'}, {'order': 0, 'type': 'escenarios', 'question': 'PREGUNTAS DE ESCENARIOS'}, {'order': 1, 'type': 'escenarios', 'question': 'Imagina que necesitas diseñar un Data Warehouse para un cliente del sector financiero. ¿Cuáles serían los pasos que seguirías?'}, {'order': 2, 'type': 'escenarios', 'question': 'Si te encuentras con un cuello de botella en un proceso de datos en tiempo real, ¿qué estrategias implementarías para solucionarlo?'}]
        self.logger.info(f"{inspect.currentframe().f_code.co_name}: fin ")
        return respuesta
