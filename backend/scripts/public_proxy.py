"""Local privacy proxy for the public tunnel.

Forwards everything to the NyayaSathi backend on 127.0.0.1:8000 except
/admin* routes, which are refused with 403 because the admin dashboard
(telemetry, citizen feedback text) has no authentication. The owner still
has full admin access via http://localhost:8000 or the LAN address.
"""
import http.client
import http.server

UPSTREAM_HOST, UPSTREAM_PORT = "127.0.0.1", 8000
PORT = 8001


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _is_admin(self):
        path = self.path.split("?", 1)[0].rstrip("/").lower()
        return path == "/admin" or path.startswith("/admin/")

    def _forward(self):
        if self._is_admin():
            body = b'{"error":"Admin console is private and not exposed publicly."}'
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        length = int(self.headers.get("Content-Length", 0) or 0)
        payload = self.rfile.read(length) if length else None

        conn = http.client.HTTPConnection(UPSTREAM_HOST, UPSTREAM_PORT, timeout=120)
        headers = {
            k: v for k, v in self.headers.items()
            if k.lower() not in ("host", "content-length", "connection", "accept-encoding")
        }
        conn.request(self.command, self.path, body=payload, headers=headers)
        resp = conn.getresponse()
        data = resp.read()

        self.send_response(resp.status)
        for key, value in resp.getheaders():
            if key.lower() not in ("transfer-encoding", "connection", "content-encoding", "content-length"):
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        conn.close()

    do_GET = _forward
    do_POST = _forward
    do_PUT = _forward
    do_PATCH = _forward
    do_DELETE = _forward
    do_OPTIONS = _forward
    do_HEAD = _forward


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    Server(("127.0.0.1", PORT), Handler).serve_forever()
