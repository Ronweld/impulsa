from django.conf import settings
from langchain_openai import ChatOpenAI

class LLMConfig:

    @staticmethod
    def get_llm(model_name: str, temperature: float):
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY
        )