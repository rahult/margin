// Local LLM proxy for Margin.
// Holds the user's API credentials (from .env) and forwards chat requests
// to any OpenAI-compatible provider, so the key never ships to the frontend.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

const DEFAULTS = {
  LLM_API_KEY: '',
  LLM_BASE_URL: 'https://api.openai.com/v1',
  LLM_MODEL: 'gpt-4o-mini',
  LLM_PROXY_PORT: '8787',
};

function loadEnv() {
  const env = {...DEFAULTS};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] in env) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

function saveEnv(env) {
  const lines = [
    '# Margin local LLM credentials (written by onboarding). Never commit this file.',
    `LLM_API_KEY=${env.LLM_API_KEY}`,
    `LLM_BASE_URL=${env.LLM_BASE_URL}`,
    `LLM_MODEL=${env.LLM_MODEL}`,
    `LLM_PROXY_PORT=${env.LLM_PROXY_PORT}`,
    '',
  ];
  fs.writeFileSync(envPath, lines.join('\n'), {mode: 0o600});
}

let config = loadEnv();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

const status = () => ({
  configured: Boolean(config.LLM_API_KEY),
  model: config.LLM_MODEL,
  baseUrl: config.LLM_BASE_URL,
});

async function handleChat(req, res) {
  if (!config.LLM_API_KEY) return send(res, 400, {error: 'No API key configured. Complete onboarding first.'});
  let body;
  try { body = await readBody(req); } catch { return send(res, 400, {error: 'Invalid JSON body.'}); }
  if (!Array.isArray(body.messages)) return send(res, 400, {error: 'Body must include messages[].'});
  const url = `${config.LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${config.LLM_API_KEY}`},
      body: JSON.stringify({model: config.LLM_MODEL, messages: body.messages, max_tokens: body.maxTokens ?? 800}),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const msg = data?.error?.message ?? `Upstream returned ${upstream.status}.`;
      return send(res, 502, {error: msg});
    }
    const content = data?.choices?.[0]?.message?.content ?? '';
    send(res, 200, {content, model: config.LLM_MODEL});
  } catch (e) {
    send(res, 502, {error: `Could not reach ${config.LLM_BASE_URL}: ${e.message}`});
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/api/status') return send(res, 200, status());
  if (req.method === 'POST' && req.url === '/api/config') {
    let body;
    try { body = await readBody(req); } catch { return send(res, 400, {error: 'Invalid JSON body.'}); }
    if (typeof body.apiKey === 'string') config.LLM_API_KEY = body.apiKey.trim();
    if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) config.LLM_BASE_URL = body.baseUrl.trim();
    if (typeof body.model === 'string' && body.model.trim()) config.LLM_MODEL = body.model.trim();
    saveEnv(config);
    return send(res, 200, status());
  }
  if (req.method === 'POST' && req.url === '/api/chat') return handleChat(req, res);
  send(res, 404, {error: 'Not found.'});
});

const port = Number(config.LLM_PROXY_PORT) || 8787;
server.listen(port, '127.0.0.1', () => {
  console.log(`margin-llm-proxy listening on http://127.0.0.1:${port} (${config.LLM_API_KEY ? 'configured' : 'no API key yet'})`);
});
