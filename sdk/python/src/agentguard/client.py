from __future__ import annotations

import json
import os
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class AgentGuardError(RuntimeError):
    """Raised when AgentGuard rejects or cannot complete a request."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


class AgentGuard:
    """Small, dependency-free client for the AgentGuard API."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 15,
        retries: int = 2,
    ):
        self.api_key = api_key if api_key is not None else os.getenv("AGENTGUARD_API_KEY")
        self.base_url = (
            base_url
            or os.getenv("AGENTGUARD_BASE_URL")
            or "http://localhost:3000"
        ).rstrip("/")
        self.timeout = timeout
        self.retries = max(0, retries)

    def _request(self, path: str, payload: dict[str, Any] | None = None) -> Any:
        body = None if payload is None else json.dumps(payload).encode()
        headers = {"Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            request = Request(
                self.base_url + path,
                data=body,
                method="GET" if body is None else "POST",
                headers=headers,
            )
            try:
                with urlopen(request, timeout=self.timeout) as response:
                    return json.load(response)
            except HTTPError as error:
                message = self._error_message(error)
                if error.code < 500:
                    raise AgentGuardError(message, error.code) from error
                last_error = AgentGuardError(message, error.code)
            except (URLError, OSError, TimeoutError) as error:
                last_error = error

            if attempt < self.retries:
                time.sleep(0.25 * (2**attempt))

        detail = f": {last_error}" if last_error else ""
        raise AgentGuardError(f"AgentGuard unavailable; fail closed{detail}", 503)

    @staticmethod
    def _error_message(error: HTTPError) -> str:
        raw = error.read().decode(errors="replace")
        try:
            payload = json.loads(raw)
            return str(payload.get("error") or raw or "AgentGuard request failed")
        except json.JSONDecodeError:
            return raw or "AgentGuard request failed"

    def _require_api_key(self) -> None:
        if not self.api_key:
            raise AgentGuardError(
                "This endpoint requires AGENTGUARD_API_KEY or api_key=.", 401
            )

    def scan(self, text: str, source: str = "UNKNOWN") -> dict[str, Any]:
        return self._request("/api/v1/scan", {"text": text, "source": source})

    def check_action(
        self,
        tool_call: dict[str, Any],
        reasoning_trace: list[str] | None = None,
        trusted_context: list[str] | None = None,
    ) -> dict[str, Any]:
        return self._request(
            "/api/v1/check-action",
            {
                "tool_call": tool_call,
                "reasoning_trace": reasoning_trace or [],
                "trusted_context": trusted_context or [],
            },
        )

    def submit_batch(
        self,
        *,
        s3_key: str | None = None,
        items: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        self._require_api_key()
        if (s3_key is None) == (items is None):
            raise ValueError("Provide exactly one of s3_key or items.")
        payload = {"s3Key": s3_key} if s3_key is not None else {"items": items}
        return self._request("/api/v1/scan-batch", payload)

    def job(self, job_id: str) -> dict[str, Any]:
        self._require_api_key()
        return self._request(f"/api/v1/jobs/{job_id}")

    def create_upload(self, filename: str, content_type: str) -> dict[str, Any]:
        self._require_api_key()
        return self._request(
            "/api/v1/uploads",
            {"filename": filename, "contentType": content_type},
        )
