"""
DO MY BEST — local preview server without browser caching.

Same as `python -m http.server 8000`, but every response says "do not cache",
so the browser always loads the latest HTML / CSS / JS after a plain refresh (F5).

Run from this folder:   python serve.py          (or: python serve.py 8080)
Then open:              http://localhost:8000/new/
Stop:                   Ctrl + C
"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("", PORT), NoCacheHandler) as httpd:
        print(f"DO MY BEST preview: http://localhost:{PORT}/new/   (no browser cache, Ctrl+C to stop)")
        httpd.serve_forever()
