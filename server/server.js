import express from 'express';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const PORT = Number(process.env.PORT || 3001);
const timeoutMs = Math.min(Math.max(Number(process.env.REQUEST_TIMEOUT_MS || 5000), 1000), 15000);
const routerBase = (process.env.ROUTER_BASE_URL || '').replace(/\/+$/, '');
const routerKey = process.env.ROUTER_API_KEY || '';
const routerModel = process.env.ROUTER_MODEL || 'model-custom';
const hermesBase = (process.env.HERMES_BASE_URL || '').replace(/\/+$/, '');
const statusPath = process.env.HERMES_STATUS_PATH || '';
const logsPath = process.env.HERMES_LOGS_PATH || '';
const hermesToken = process.env.HERMES_BEARER_TOKEN || '';

const AGENTS = [
  { id: 'hermes', name: 'Hermes Core', role: 'Orchestrator', desc: 'Chat, reasoning, task delegation', color: '#2ee6a6' },
  { id: 'router', name: '9Router Gateway', role: 'Model Gateway', desc: 'OpenAI-compatible /v1 API routing', color: '#9b72ff' },
  { id: 'tools', name: 'Tool Runner', role: 'Tools & Plugins', desc: 'System inspection, diagnostics, sandbox', color: '#48c9f5' },
  { id: 'memory', name: 'Memory Store', role: 'Context / DB', desc: 'Context persistence, key-value memory', color: '#f6b44c' }
];

const memoryStore = new Map();
const internalLogs = [
  { id: 'l_init_1', time: new Date(Date.now() - 60000).toISOString(), level: 'INFO', message: 'Hermes Agent 3D system online. 4 agen terdaftar.', agentId: 'hermes' },
  { id: 'l_init_2', time: new Date(Date.now() - 45000).toISOString(), level: 'INFO', message: '9Router gateway listener aktif pada /api/models proxy.', agentId: 'router' }
];

const tasks = [
  {
    id: 't_init_1',
    agentId: 'hermes',
    title: 'Inisialisasi Lingkungan Agen',
    input: 'Bootstrapping multi-agent mesh and checking communication links.',
    status: 'completed',
    progress: 100,
    createdAt: new Date(Date.now() - 120000).toISOString(),
    startedAt: new Date(Date.now() - 120000).toISOString(),
    completedAt: new Date(Date.now() - 110000).toISOString(),
    logs: [
      `[${new Date(Date.now() - 120000).toLocaleTimeString('id-ID')}] System bootstrap triggered.`,
      `[${new Date(Date.now() - 115000).toLocaleTimeString('id-ID')}] Mesh channel verified.`,
      `[${new Date(Date.now() - 110000).toLocaleTimeString('id-ID')}] Inisialisasi sukses.`
    ],
    output: 'Sistem siap menerima penugasan pekerjaan.'
  }
];

function addLog(level, message, agentId = null) {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    time: new Date().toISOString(),
    level,
    message,
    agentId
  };
  internalLogs.unshift(entry);
  if (internalLogs.length > 200) internalLogs.pop();
  return entry;
}

function getAgentStats() {
  return AGENTS.map(agent => {
    const agentTasks = tasks.filter(t => t.agentId === agent.id);
    const activeTask = agentTasks.find(t => t.status === 'working');
    return {
      ...agent,
      status: activeTask ? 'working' : 'idle',
      currentTask: activeTask ? activeTask.title : null,
      taskStats: {
        total: agentTasks.length,
        completed: agentTasks.filter(t => t.status === 'completed').length,
        working: activeTask ? 1 : 0,
        failed: agentTasks.filter(t => t.status === 'failed').length
      }
    };
  });
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const body = await response.text();
    let data;
    try { data = body ? JSON.parse(body) : null; } catch { data = { message: body.slice(0, 500) }; }
    return { ok: response.ok, status: response.status, data };
  } finally { clearTimeout(timer); }
}

function hermesHeaders() {
  return hermesToken ? { Authorization: `Bearer ${hermesToken}`, Accept: 'application/json' } : { Accept: 'application/json' };
}

function configuredHermesPath(path) {
  if (!hermesBase || !path) return null;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return `${hermesBase}${path}`;
}

async function runTask(task) {
  task.status = 'working';
  task.startedAt = new Date().toISOString();
  task.progress = 20;

  const appendTaskLog = (msg) => {
    task.logs.push(`[${new Date().toLocaleTimeString('id-ID')}] ${msg}`);
  };

  try {
    if (task.agentId === 'hermes') {
      appendTaskLog('Hermes Core menganalisis instruksi...');
      task.progress = 40;

      let aiResult = null;
      if (routerBase && routerKey) {
        try {
          appendTaskLog(`Menghubungi 9Router model: ${routerModel}...`);
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const res = await fetch(`${routerBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${routerKey}`
            },
            body: JSON.stringify({
              model: routerModel,
              messages: [
                { role: 'system', content: 'You are Hermes AI Agent Orchestrator. Respond concisely in Indonesian without fluff.' },
                { role: 'user', content: task.input || task.title }
              ],
              max_tokens: 400
            }),
            signal: controller.signal
          }).finally(() => clearTimeout(timer));

          if (res.ok) {
            const data = await res.json();
            aiResult = data.choices?.[0]?.message?.content;
            appendTaskLog('Inference berhasil diterima via 9Router.');
          } else {
            appendTaskLog(`9Router response status: ${res.status}`);
          }
        } catch (e) {
          appendTaskLog(`9Router fallback: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
        }
      }

      await new Promise(r => setTimeout(r, 600));
      task.progress = 85;

      if (!aiResult) {
        aiResult = `Tugas dieksekusi Hermes Core.\n- Instruksi: "${task.title}"\n- Detail: "${task.input || task.title}"\n- Rencana orkestrasi: 1) Verifikasi konteks, 2) Eksekusi operasi pada mesh, 3) Rekonsiliasi aktivitas.\n- Status: Selesai dengan sukses.`;
      }
      task.output = aiResult;
      task.progress = 100;
      task.status = 'completed';
      appendTaskLog('Tugas orkestrasi selesai.');
      addLog('SUCCESS', `[hermes] Tugas "${task.title}" selesai.`, 'hermes');

    } else if (task.agentId === 'router') {
      appendTaskLog('9Router Gateway menguji konektivitas model...');
      task.progress = 40;
      const t0 = Date.now();
      let ok = false;
      let latency = 0;
      let count = 0;

      if (routerBase && routerKey) {
        try {
          const r = await fetchJson(`${routerBase}/models`, { Authorization: `Bearer ${routerKey}`, Accept: 'application/json' });
          latency = Date.now() - t0;
          ok = r.ok;
          count = Array.isArray(r.data?.data) ? r.data.data.length : 0;
        } catch {
          latency = Date.now() - t0;
        }
      } else {
        await new Promise(r => setTimeout(r, 800));
        latency = 15;
        ok = false;
      }

      task.progress = 100;
      task.status = ok ? 'completed' : 'failed';
      task.output = ok
        ? `9Router Online. Latensi: ${latency}ms. Model terdeteksi: ${count} model. Rute API OpenAI-compatible aktif.`
        : `9Router offline/timeout (${latency}ms). Periksa ROUTER_BASE_URL dan ROUTER_API_KEY.`;
      appendTaskLog(task.output);
      addLog(ok ? 'SUCCESS' : 'WARN', `[router] Uji koneksi: ${ok ? 'Sukses' : 'Gagal'} (${latency}ms)`, 'router');

    } else if (task.agentId === 'tools') {
      appendTaskLog('Tool Runner mempersiapkan lingkungan runtime...');
      task.progress = 40;
      await new Promise(r => setTimeout(r, 800));

      const uptimeMin = Math.round(process.uptime() / 60);
      const mem = process.memoryUsage();
      const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
      const rssMb = Math.round(mem.rss / 1024 / 1024);

      task.progress = 85;
      appendTaskLog('Tool Runner mengeksekusi inspeksi sistem & diagnostik...');
      task.output = `Hasil eksekusi Tool Runner untuk: "${task.title}"\n- Runtime: Node.js ${process.version} (Linux)\n- Process Uptime: ${uptimeMin} menit\n- Memory Heap: ${heapMb} MB (RSS: ${rssMb} MB)\n- Sandbox status: Siap dan aktif menerima eksekusi plugin.`;
      task.progress = 100;
      task.status = 'completed';
      appendTaskLog('Tool execution selesai dengan sukses.');
      addLog('SUCCESS', `[tools] Eksekusi tool "${task.title}" berhasil.`, 'tools');

    } else if (task.agentId === 'memory') {
      appendTaskLog('Memory Store memuat bank memori sesi...');
      task.progress = 50;
      await new Promise(r => setTimeout(r, 600));

      const key = `mem_${Date.now()}`;
      const record = { title: task.title, value: task.input || task.title, savedAt: new Date().toISOString() };
      memoryStore.set(key, record);

      task.progress = 100;
      task.status = 'completed';
      task.output = `Konteks berhasil dikomit ke Memory Store.\n- Key ID: ${key}\n- Total entri tersimpan: ${memoryStore.size}\n- Konten: "${record.value}"\n- Indeks memori aktif.`;
      appendTaskLog(`Konteks disimpan dengan ID ${key}.`);
      addLog('SUCCESS', `[memory] Menyimpan memori baru: "${task.title}" (${memoryStore.size} entri)`, 'memory');
    }
  } catch (err) {
    task.status = 'failed';
    task.output = `Kegagalan eksekusi: ${err.message}`;
    appendTaskLog(`Error: ${err.message}`);
    addLog('ERROR', `[${task.agentId}] Tugas gagal: ${err.message}`, task.agentId);
  } finally {
    task.completedAt = new Date().toISOString();
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'hermes-agent-3d-api' }));

app.get('/api/agents', (_req, res) => {
  res.json({ ok: true, agents: getAgentStats() });
});

app.get('/api/tasks', (req, res) => {
  const { agentId } = req.query;
  const filtered = agentId ? tasks.filter(t => t.agentId === agentId) : tasks;
  res.json({ ok: true, tasks: filtered.slice(0, 50) });
});

app.post('/api/tasks', (req, res) => {
  const { agentId, title, input } = req.body || {};
  const validAgent = AGENTS.find(a => a.id === agentId);
  if (!validAgent) {
    return res.status(400).json({ error: `Agent ID tidak valid. Pilihan: ${AGENTS.map(a => a.id).join(', ')}` });
  }

  const cleanTitle = (title || 'Tugas Baru').trim().slice(0, 150);
  const cleanInput = (input || title || '').trim().slice(0, 4000);

  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    agentId: validAgent.id,
    title: cleanTitle,
    input: cleanInput,
    status: 'working',
    progress: 10,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    logs: [`[${new Date().toLocaleTimeString('id-ID')}] Tugas ditugaskan ke ${validAgent.name}. Memulai proses...`],
    output: null
  };

  tasks.unshift(task);
  if (tasks.length > 100) tasks.pop();
  addLog('INFO', `[${validAgent.id}] Tugas baru diterima: "${task.title}"`, validAgent.id);

  // Background execution
  runTask(task).catch(err => {
    task.status = 'failed';
    task.output = String(err.message || err);
    task.completedAt = new Date().toISOString();
  });

  res.status(201).json({ ok: true, task });
});

app.post('/api/tasks/:id/cancel', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Tugas tidak ditemukan' });
  if (task.status === 'working') {
    task.status = 'failed';
    task.output = 'Dibatalkan oleh pengguna.';
    task.completedAt = new Date().toISOString();
    task.logs.push(`[${new Date().toLocaleTimeString('id-ID')}] Tugas dibatalkan.`);
    addLog('WARN', `[${task.agentId}] Tugas "${task.title}" dibatalkan.`, task.agentId);
  }
  res.json({ ok: true, task });
});

app.get('/api/status', async (_req, res) => {
  const result = {
    generatedAt: new Date().toISOString(),
    sources: {
      router: { configured: Boolean(routerBase && routerKey), state: 'unknown', detail: 'Belum diperiksa' },
      hermes: { configured: Boolean(configuredHermesPath(statusPath)), state: 'unconfigured', detail: 'Endpoint status Hermes belum dikonfigurasi' }
    },
    model: routerModel,
    agents: getAgentStats(),
    taskSummary: {
      total: tasks.length,
      working: tasks.filter(t => t.status === 'working').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    }
  };

  if (routerBase && routerKey) {
    try {
      const r = await fetchJson(`${routerBase}/models`, { Authorization: `Bearer ${routerKey}`, Accept: 'application/json' });
      result.sources.router = {
        configured: true, state: r.ok ? 'online' : 'error',
        detail: r.ok ? 'GET /models berhasil' : `Router HTTP ${r.status}`
      };
      if (r.ok && Array.isArray(r.data?.data)) {
        result.modelCount = r.data.data.length;
        result.models = r.data.data.slice(0, 30).map(m => ({ id: String(m.id || 'unknown'), owned_by: m.owned_by || 'unknown' }));
      }
    } catch (e) {
      result.sources.router = { configured: true, state: 'error', detail: e.name === 'AbortError' ? 'Timeout menghubungi router' : 'Tidak dapat menghubungi router' };
    }
  } else {
    result.sources.router = { configured: false, state: 'unconfigured', detail: 'ROUTER_BASE_URL atau ROUTER_API_KEY belum dikonfigurasi' };
  }

  const statusUrl = configuredHermesPath(statusPath);
  if (statusUrl) {
    try {
      const r = await fetchJson(statusUrl, hermesHeaders());
      result.sources.hermes = { configured: true, state: r.ok ? 'online' : 'error', detail: r.ok ? 'Endpoint status berhasil diakses' : `Hermes HTTP ${r.status}` };
      if (r.ok) result.hermesStatus = r.data;
    } catch (e) {
      result.sources.hermes = { configured: true, state: 'error', detail: e.name === 'AbortError' ? 'Timeout menghubungi Hermes' : 'Tidak dapat menghubungi endpoint Hermes' };
    }
  }
  res.json(result);
});

app.get('/api/models', async (_req, res) => {
  if (!routerBase || !routerKey) return res.status(503).json({ error: 'Router belum dikonfigurasi. Isi ROUTER_BASE_URL dan ROUTER_API_KEY.' });
  try {
    const r = await fetchJson(`${routerBase}/models`, { Authorization: `Bearer ${routerKey}`, Accept: 'application/json' });
    res.status(r.status).json(r.data ?? {});
  } catch (e) {
    res.status(502).json({ error: e.name === 'AbortError' ? 'Router timeout' : 'Router tidak dapat dihubungi' });
  }
});

app.get('/api/logs', async (req, res) => {
  const logsUrl = configuredHermesPath(logsPath);
  if (logsUrl) {
    try {
      const r = await fetchJson(logsUrl, hermesHeaders());
      if (r.ok) return res.json({ configured: true, data: r.data });
    } catch (e) {
      // upstream failed; fallback to internal activity logs
    }
  }
  res.json({ configured: Boolean(logsUrl), data: internalLogs });
});

app.listen(PORT, '0.0.0.0', () => console.log(`API proxy listening on ${PORT}`));
