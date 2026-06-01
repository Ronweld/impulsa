from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain.prompts import ChatPromptTemplate
from .llm_config import LLMConfig
from ..agents.evaluation_agent import EvaluationAgent

class AgentFactory:

    @staticmethod
    def create(template, tools, memory):

        if tools is None or len(tools) == 0:
            raise ValueError("Debes pasar al menos una tool para OpenAI Functions Agent")

        llm = LLMConfig.get_llm(
            template.model_name,
            template.temperature
        )   

        prompt = ChatPromptTemplate.from_messages([
            ("system", template.system_prompt),
            ("user", "{input}"),
            ("assistant", "{agent_scratchpad}")
        ])

        agent = create_openai_functions_agent(
            llm=llm,
            tools=tools,
            prompt=prompt
        )

        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            memory=memory,
            verbose=True,
            output_keys=["output"]
        )

        #if template.name == "evaluation_agent":
        #    return EvaluationAgent(agent_executor)
        return agent_executor