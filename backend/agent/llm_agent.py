from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from agent.kafka_tool import send_issue_to_redpanda
import os

async def process_user_issue(user_description: str, telemetry_context: dict):
    if not os.environ.get("GOOGLE_API_KEY"):
        raise ValueError("GOOGLE_API_KEY environment variable not set")

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
    tools = [send_issue_to_redpanda]
    
    system_prompt = """You are an AI assistant that analyzes user-reported issues and telemetry data.
    Analyze the user's issue and how it might relate to the telemetry data provided.
    Format a clean, detailed report summarizing the issue, potential root causes, and relevant context.
    You MUST use the 'send_issue_to_redpanda' tool to send the report to the 'user-issues' topic.
    Respond with a brief summary of what you did.
    """
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "User Issue Description: {user_description}\nTelemetry Defaults/Context: {telemetry_context}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    response = await agent_executor.ainvoke({
        "user_description": user_description,
        "telemetry_context": str(telemetry_context)
    })
    
    return response
