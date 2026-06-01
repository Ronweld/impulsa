from .base_agent import BaseAgent

class JDAgent(BaseAgent):
    
    def extract_profile(self, jd_text):
        prompt = f"""
        Analiza el siguiente Job Description:
        {jd_text}
        Devuelve:
        - tecnologías
        - seniority
        - soft skills
        - hard skills
        """

        return self.run(prompt)