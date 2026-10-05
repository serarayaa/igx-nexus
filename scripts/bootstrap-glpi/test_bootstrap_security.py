#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


BOOTSTRAP_PATH = Path(__file__).with_name("bootstrap.py")
SPEC = importlib.util.spec_from_file_location("igx_nexus_bootstrap_glpi", BOOTSTRAP_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("No fue posible cargar bootstrap.py para pruebas.")
bootstrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bootstrap)


class QuietHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        return


class RedirectTargetHandler(QuietHandler):
    requests = 0
    authorizations: list[str | None] = []

    def do_GET(self) -> None:
        type(self).requests += 1
        type(self).authorizations.append(self.headers.get("Authorization"))
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b"[]")


class RedirectSourceHandler(QuietHandler):
    target_url = ""
    authorizations: list[str | None] = []

    def do_GET(self) -> None:
        type(self).authorizations.append(self.headers.get("Authorization"))
        self.send_response(302)
        self.send_header("Location", type(self).target_url)
        self.end_headers()


class ErrorBodyHandler(QuietHandler):
    def do_GET(self) -> None:
        self.send_response(500)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"SENSITIVE-UPSTREAM-DETAIL-MUST-NOT-LEAK")


class ServerHarness:
    def __init__(self, handler: type[BaseHTTPRequestHandler]) -> None:
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    @property
    def base_url(self) -> str:
        host, port = self.server.server_address[:2]
        return f"http://{host}:{port}/api.php/v2.3.0"

    def __enter__(self) -> "ServerHarness":
        self.thread.start()
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)


class GLPIBootstrapSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        RedirectTargetHandler.requests = 0
        RedirectTargetHandler.authorizations = []
        RedirectSourceHandler.authorizations = []

    def test_rejects_plain_http_for_non_loopback_hosts(self) -> None:
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            bootstrap.GLPIClient("http://example.com/api.php/v2.3.0", "secret-token")

    def test_allows_plain_http_only_for_explicit_loopback_lab_endpoints(self) -> None:
        for url in (
            "http://localhost:8080/api.php/v2.3.0",
            "http://127.0.0.1:8080/api.php/v2.3.0",
            "http://[::1]:8080/api.php/v2.3.0",
        ):
            with self.subTest(url=url):
                client = bootstrap.GLPIClient(url, "secret-token")
                self.assertEqual(client.base_url, url)

    def test_blocks_redirect_before_bearer_token_can_reach_second_origin(self) -> None:
        with ServerHarness(RedirectTargetHandler) as target:
            RedirectSourceHandler.target_url = (
                f"http://127.0.0.1:{target.server.server_address[1]}/capture"
            )
            with ServerHarness(RedirectSourceHandler) as source:
                client = bootstrap.GLPIClient(source.base_url, "super-secret-token")

                with self.assertRaisesRegex(RuntimeError, "redirects autenticados"):
                    client.get("/Administration/Entity")

        self.assertEqual(
            RedirectSourceHandler.authorizations,
            ["Bearer super-secret-token"],
        )
        self.assertEqual(RedirectTargetHandler.requests, 0)
        self.assertEqual(RedirectTargetHandler.authorizations, [])

    def test_does_not_expose_upstream_error_body(self) -> None:
        with ServerHarness(ErrorBodyHandler) as upstream:
            client = bootstrap.GLPIClient(upstream.base_url, "secret-token")
            with self.assertRaises(RuntimeError) as raised:
                client.get("/Administration/Entity")

        message = str(raised.exception)
        self.assertIn("HTTP 500", message)
        self.assertNotIn("SENSITIVE-UPSTREAM-DETAIL-MUST-NOT-LEAK", message)

    def test_rejects_credentials_query_and_fragment_in_base_url(self) -> None:
        invalid_urls = (
            "https://user:password@example.com/api.php/v2.3.0",
            "https://example.com/api.php/v2.3.0?debug=1",
            "https://example.com/api.php/v2.3.0#fragment",
        )
        for url in invalid_urls:
            with self.subTest(url=url), self.assertRaises(ValueError):
                bootstrap.GLPIClient(url, "secret-token")


if __name__ == "__main__":
    unittest.main()
