from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA

class RAGEngine:

    def __init__(self, documents, llm):
        embeddings = OpenAIEmbeddings()
        self.vectorstore = FAISS.from_documents(documents, embeddings)
        self.retriever = self.vectorstore.as_retriever()
        self.llm = llm

    def query(self, question):
        qa = RetrievalQA.from_chain_type(
            llm=self.llm,
            retriever=self.retriever
        )
        return qa.run(question)