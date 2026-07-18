from __future__ import annotations

import asyncio
import inspect
import json
from functools import wraps
from typing import Any, Callable, ParamSpec, TypeVar, cast

from .client import AgentGuard, AgentGuardError

P = ParamSpec("P")
R = TypeVar("R")


class AgentGuardBlockedError(AgentGuardError):
    """Raised when a workflow boundary is blocked by AgentGuard."""

    def __init__(
        self,
        message: str,
        *,
        stage: str,
        risk: float,
        decision: dict[str, Any],
    ):
        super().__init__(message, 403)
        self.stage = stage
        self.risk = risk
        self.decision = decision


class AgentGuardMiddleware:
    """Framework-neutral pre-model, pre-tool, and post-tool security gates."""

    def __init__(self, client: AgentGuard | None = None):
        self.client = client or AgentGuard()

    def before_model(
        self,
        content: str,
        *,
        source: str = "USER_PROMPT",
    ) -> dict[str, Any]:
        decision = self.client.scan(content, source)
        self._require_allowed(decision, "model input")
        return decision

    def before_tool(
        self,
        name: str,
        arguments: dict[str, Any],
        *,
        reasoning_trace: list[str] | None = None,
        trusted_context: list[str] | None = None,
    ) -> dict[str, Any]:
        decision = self.client.check_action(
            {"name": name, "arguments": self._json_safe(arguments)},
            reasoning_trace=reasoning_trace,
            trusted_context=trusted_context,
        )
        if not decision["allowed"]:
            raise AgentGuardBlockedError(
                decision.get("reason", f"Tool {name} was blocked."),
                stage="tool call",
                risk=float(decision["risk"]),
                decision=decision,
            )
        return decision

    def after_tool(
        self,
        output: R,
        *,
        source: str = "TOOL_OUTPUT",
    ) -> R:
        serialized = output if isinstance(output, str) else json.dumps(
            self._json_safe(output),
            separators=(",", ":"),
        )
        decision = self.client.scan(serialized, source)
        self._require_allowed(decision, "tool output")
        sanitized = decision.get("sanitized_text", serialized)
        if isinstance(output, str):
            return cast(R, sanitized)
        if sanitized != serialized:
            try:
                return cast(R, json.loads(sanitized))
            except json.JSONDecodeError:
                raise AgentGuardBlockedError(
                    "AgentGuard sanitized structured output that could not be reconstructed safely.",
                    stage="tool output",
                    risk=float(decision["risk"]),
                    decision=decision,
                )
        return output

    async def abefore_model(
        self,
        content: str,
        *,
        source: str = "USER_PROMPT",
    ) -> dict[str, Any]:
        return await asyncio.to_thread(self.before_model, content, source=source)

    async def abefore_tool(
        self,
        name: str,
        arguments: dict[str, Any],
        *,
        reasoning_trace: list[str] | None = None,
        trusted_context: list[str] | None = None,
    ) -> dict[str, Any]:
        return await asyncio.to_thread(
            self.before_tool,
            name,
            arguments,
            reasoning_trace=reasoning_trace,
            trusted_context=trusted_context,
        )

    async def aafter_tool(
        self,
        output: R,
        *,
        source: str = "TOOL_OUTPUT",
    ) -> R:
        return await asyncio.to_thread(self.after_tool, output, source=source)

    def wrap_tool(
        self,
        function: Callable[P, R],
        *,
        trusted_context: list[str] | None = None,
    ) -> Callable[P, R]:
        if inspect.iscoroutinefunction(function):
            @wraps(function)
            async def async_wrapper(*args: P.args, **kwargs: P.kwargs):
                arguments = {"args": args, "kwargs": kwargs}
                await self.abefore_tool(
                    function.__name__,
                    arguments,
                    trusted_context=trusted_context,
                )
                output = await function(*args, **kwargs)
                return await self.aafter_tool(output)

            return cast(Callable[P, R], async_wrapper)

        @wraps(function)
        def wrapper(*args: P.args, **kwargs: P.kwargs):
            arguments = {"args": args, "kwargs": kwargs}
            self.before_tool(
                function.__name__,
                arguments,
                trusted_context=trusted_context,
            )
            return self.after_tool(function(*args, **kwargs))

        return cast(Callable[P, R], wrapper)

    @staticmethod
    def _require_allowed(decision: dict[str, Any], stage: str) -> None:
        if decision["blocked"]:
            raise AgentGuardBlockedError(
                decision.get("policy", {}).get(
                    "reason",
                    f"AgentGuard blocked {stage}.",
                ),
                stage=stage,
                risk=float(decision["risk"]),
                decision=decision,
            )

    @staticmethod
    def _json_safe(value: Any) -> Any:
        return json.loads(json.dumps(value, default=repr))
