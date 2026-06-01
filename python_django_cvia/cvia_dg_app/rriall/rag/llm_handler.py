import openai
import together

class LLMHandler:
    """Clase que permite conectarse y generar respuestas con múltiples modelos LLM."""
    
    def __init__(self, api_key, provider="openai", service_tier='flex', timeout = 300, base_url="https://api.together.xyz/v1"):
        self.api_key = api_key
        self.provider = provider
        self.service_tier = service_tier
        
        if provider.lower() == "openai":
            self.client = openai.OpenAI(
                api_key=self.api_key,
                # Se subir el timeout para Flex, ya que la respuesta puede tardar más
                timeout=timeout  # 5 minutos (300 segundos), cuando trabajamos con capa Flex
            )
        elif provider.lower() == "togetherai":
            self.client = together.Client(api_key=self.api_key, base_url=base_url)
        else:
            raise ValueError("Proveedor de LLM no soportado")

    def generate_response(self, model, messages, temperature=0.7):
        """Genera una respuesta utilizando el modelo de LLM seleccionado."""
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            service_tier=self.service_tier,
            temperature=temperature
        )
        return response.choices[0].message.content
    
    def generate_response_test(self, model, messages, temperature=0.7):
        """Genera una respuesta utilizando el modelo de LLM seleccionado."""

        return "OK- respuesta forzadas"
