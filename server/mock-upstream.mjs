// Mock OpenAI-compatible upstream for local development and testing.
// Responds to POST /v1/chat/completions with a canned assistant message.
import http from 'node:http';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      let model = 'unknown';
      try { model = JSON.parse(data).model ?? 'unknown'; } catch { /* ignore */ }
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        choices: [{message: {role: 'assistant', content: `Mock response from model "${model}". The proxy pipeline works.`}}],
      }));
    });
    return;
  }
  res.writeHead(404, {'Content-Type': 'application/json'});
  res.end('{"error":"not found"}');
});

const port = Number(process.argv[2]) || 9999;
server.listen(port, '127.0.0.1', () => console.log(`mock-upstream on http://127.0.0.1:${port}/v1`));
