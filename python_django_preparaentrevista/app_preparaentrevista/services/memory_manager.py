from langchain.memory import ConversationBufferMemory

class MemoryManager:

    def __init__(self):
        self.memory = ConversationBufferMemory(
            return_messages=True
        )

    def get_memory(self):
        return self.memory