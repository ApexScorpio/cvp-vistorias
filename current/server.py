import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

PORT = 8080
with http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print("No-cache mode — browser always gets fresh files.")
    httpd.serve_forever()
