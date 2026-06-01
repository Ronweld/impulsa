from langchain.tools import Tool
import requests
from bs4 import BeautifulSoup

class WebSearchTool:

    @staticmethod
    def search(query: str) -> str:
        url = f"https://www.google.com/search?q={query}"
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(response.text, "html.parser")

        results = []
        for g in soup.select("div.g")[:3]:
            text = g.get_text()
            results.append(text)

        return "\n".join(results)

    @staticmethod
    def get_tool():
        return Tool(
            name="web_search",
            func=WebSearchTool.search,
            description="Busca información técnica en la web"
        )