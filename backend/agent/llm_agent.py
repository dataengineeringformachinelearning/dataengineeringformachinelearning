import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

from agent.kafka_tool import send_issue_to_redpanda


async def process_user_issue(
  user_description: str, telemetry_context: dict, bug_report_id: str | None = None
):
  if not os.environ.get("GOOGLE_API_KEY"):
    raise ValueError("GOOGLE_API_KEY environment variable not set")

  llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
  tools = [send_issue_to_redpanda]

  system_prompt = """You are an AI assistant that analyzes user-reported issues and telemetry data.
    Analyze the user's issue and how it might relate to the telemetry data provided.
    Format a clean, detailed report summarizing the issue, potential root causes, and relevant context.
    You MUST use the 'send_issue_to_redpanda' tool to send the report to the 'user-issues' topic.
    Make sure to pass the provided bug_report_id to the tool call.
    Respond with a brief summary of what you did.
    """

  agent = create_react_agent(llm, tools, state_modifier=system_prompt)

  user_message = f"User Issue Description: {user_description}\nTelemetry Defaults/Context: {telemetry_context}\nBug Report Database ID: {bug_report_id}"
  response = await agent.ainvoke({"messages": [("user", user_message)]})

  return response["messages"][-1].content
