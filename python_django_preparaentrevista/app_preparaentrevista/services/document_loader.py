import requests
from bs4 import BeautifulSoup
from langchain_community.document_loaders import PyPDFLoader
from langchain.docstore.document import Document

class DocumentLoaderService:

    def load_from_pdf(self, path):
        loader = PyPDFLoader(path)
        return loader.load()

    def load_from_url(self, url):
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")
        text = soup.get_text()
        return [Document(page_content=text)]

    def load_from_text(self, text):
        return [Document(page_content=text)]