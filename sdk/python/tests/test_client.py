import io
import json
import unittest
from unittest.mock import patch

from agentguard import AgentGuard, AgentGuardError


class Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


class AgentGuardTest(unittest.TestCase):
    @patch("agentguard.client.urlopen")
    def test_public_scan_omits_authorization(self, mocked_urlopen):
        mocked_urlopen.return_value = Response(
            json.dumps({"blocked": False, "risk": 0.1}).encode()
        )
        guard = AgentGuard(base_url="https://guard.test", retries=0)

        result = guard.scan("Safe content", source="DOCUMENT")

        request = mocked_urlopen.call_args.args[0]
        self.assertIsNone(request.get_header("Authorization"))
        self.assertEqual(json.loads(request.data), {
            "text": "Safe content",
            "source": "DOCUMENT",
        })
        self.assertFalse(result["blocked"])

    @patch("agentguard.client.urlopen")
    def test_authenticated_action_uses_real_api_shape(self, mocked_urlopen):
        mocked_urlopen.return_value = Response(
            json.dumps({"allowed": True, "risk": 0.2}).encode()
        )
        guard = AgentGuard(
            api_key="ag_live_test", base_url="https://guard.test", retries=0
        )

        guard.check_action(
            {"name": "send_email"},
            reasoning_trace=["The user requested it."],
            trusted_context=["Approved ticket"],
        )

        request = mocked_urlopen.call_args.args[0]
        payload = json.loads(request.data)
        self.assertEqual(request.get_header("Authorization"), "Bearer ag_live_test")
        self.assertEqual(payload["tool_call"], {"name": "send_email"})
        self.assertEqual(payload["trusted_context"], ["Approved ticket"])

    def test_batch_requires_an_api_key(self):
        with self.assertRaises(AgentGuardError):
            AgentGuard(base_url="https://guard.test").submit_batch(
                items=[{"text": "hello", "source": "DOCUMENT"}]
            )

    @patch("agentguard.client.urlopen")
    def test_document_scan_uses_document_endpoint_and_timeout(self, mocked_urlopen):
        mocked_urlopen.return_value = Response(
            json.dumps({"blocked": False, "risk": 0.1}).encode()
        )
        guard = AgentGuard(
            base_url="https://guard.test", document_timeout=123, retries=0
        )

        guard.scan_document("large document")

        request = mocked_urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://guard.test/api/v1/scan-document")
        self.assertEqual(mocked_urlopen.call_args.kwargs["timeout"], 123)
        self.assertEqual(json.loads(request.data)["source"], "DOCUMENT")


if __name__ == "__main__":
    unittest.main()
