import http.server
import socketserver
import json
import os

class LogHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/log':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                log_data = json.loads(post_data.decode('utf-8'))
                print(f"BROWSER LOG: {json.dumps(log_data)}")
                with open('browser_logs.txt', 'a', encoding='utf-8') as f:
                    f.write(json.dumps(log_data) + '\n')
            except Exception as e:
                print(f"Error parsing log: {e}")
                
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
            
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    os.chdir(r"C:\Users\lopes\Desktop\CVP_Vistorias")
    with open('browser_logs.txt', 'w', encoding='utf-8') as f:
        f.write("--- Start of Logs ---\n")
    with socketserver.TCPServer(("127.0.0.1", 9999), LogHandler) as httpd:
        print("Log server listening on port 9999")
        httpd.serve_forever()
