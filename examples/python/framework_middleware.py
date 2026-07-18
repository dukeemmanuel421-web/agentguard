"""Framework-neutral AgentGuard boundaries for an agent workflow."""

from agentguard import AgentGuardBlockedError, AgentGuardMiddleware


guard = AgentGuardMiddleware()


@guard.wrap_tool
def fetch_web_page(url: str) -> str:
    # Replace with a LangChain, CrewAI, AutoGen, OpenAI Agents, MCP, or custom tool.
    return f"Public content retrieved from {url}"


def run_agent(user_input: str) -> str:
    guard.before_model(user_input, source="USER_PROMPT")
    trusted_tool_output = fetch_web_page("https://example.com")

    # Only content that passed AgentGuard reaches the model context.
    return f"Model context:\n{user_input}\n{trusted_tool_output}"


try:
    print(run_agent("Summarize the linked page."))
except AgentGuardBlockedError as error:
    print(f"Blocked at {error.stage}: {error.risk:.0%} risk")
