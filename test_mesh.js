import assert from 'node:assert';

const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:8088';

async function run() {
  console.log(`Checking Hermes 3D Mesh at ${BASE_URL}...`);

  // 1. Check agents endpoint
  const agentsRes = await fetch(`${BASE_URL}/api/agents`);
  assert.strictEqual(agentsRes.status, 200, 'Agents API must return 200');
  const { ok, agents } = await agentsRes.json();
  assert.strictEqual(ok, true, 'Agents API response ok must be true');
  assert.strictEqual(agents.length, 4, 'Must have 4 registered agents');

  // 2. Assign task to Tool Runner
  const assignRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'tools',
      title: 'Smoke Test Validation',
      input: 'Verify dispatch loop and response logging.'
    })
  });
  assert.strictEqual(assignRes.status, 201, 'Task creation must return 201');
  const { task } = await assignRes.json();
  assert.ok(task.id, 'Task must have an ID');
  assert.strictEqual(task.agentId, 'tools');

  // 3. Poll for task completion (max 5s)
  let doneTask = null;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    const tasksRes = await fetch(`${BASE_URL}/api/tasks?agentId=tools`);
    const tasksData = await tasksRes.json();
    doneTask = tasksData.tasks?.find(t => t.id === task.id);
    if (doneTask && doneTask.status !== 'working') break;
  }

  assert.ok(doneTask, 'Task must exist in task list');
  assert.strictEqual(doneTask.status, 'completed', 'Task must complete');
  assert.ok(doneTask.output.length > 0, 'Task must have output');
  assert.ok(doneTask.logs.length >= 2, 'Task must have step logs');

  // 4. Verify system logs
  const logsRes = await fetch(`${BASE_URL}/api/logs`);
  const logsData = await logsRes.json();
  assert.ok(Array.isArray(logsData.data), 'Logs data must be an array');
  const foundLog = logsData.data.some(l => l.message && l.message.includes('Smoke Test Validation'));
  assert.ok(foundLog, 'Task assignment must appear in system logs');

  console.log('✓ All 4 mesh checks passed successfully.');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
