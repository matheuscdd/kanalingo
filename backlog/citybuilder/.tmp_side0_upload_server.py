from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(r"c:\Users\Claus\Downloads\kanalingo\backlog\citybuilder")
PORT = 4174


class Handler(BaseHTTPRequestHandler):
    def _send_headers(self, status=200, content_type="text/plain; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:4173")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._send_headers(204)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/upload":
            self._send_headers(404)
            self.wfile.write(b"Not found")
            return

        params = parse_qs(parsed.query)
        relative_path = params.get("path", [""])[0].strip().replace("\\", "/")
        if not relative_path:
            self._send_headers(400)
            self.wfile.write(b"Missing path")
            return

        target = (ROOT / relative_path).resolve()
        if ROOT not in target.parents and target != ROOT:
            self._send_headers(403)
            self.wfile.write(b"Forbidden")
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        payload = self.rfile.read(length)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        self._send_headers(200, "application/json; charset=utf-8")
        self.wfile.write(("{\"saved\": \"%s\", \"bytes\": %d}" % (relative_path, len(payload))).encode("utf-8"))

    def log_message(self, format, *args):
        print(format % args)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Listening on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    finally:
        server.server_close()
