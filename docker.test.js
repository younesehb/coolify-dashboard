import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './docker.js';

const stats = (cpu, sys, rx, tx) => ({
  cpu_stats: { cpu_usage: { total_usage: cpu }, system_cpu_usage: sys, online_cpus: 4 },
  memory_stats: { usage: 300e6, limit: 2e9, stats: { inactive_file: 100e6 } },
  networks: { eth0: { rx_bytes: rx, tx_bytes: tx } },
  blkio_stats: {
    io_service_bytes_recursive: [
      { op: 'Read', value: 10 },
      { op: 'Write', value: 20 }
    ]
  },
  pids_stats: { current: 7 }
});

test('first sample has no CPU or network rate yet', () => {
  const s = summarize({}, stats(1000, 10000, 500, 100), null, 0);
  assert.equal(s.cpu, null);
  assert.equal(s.rx, null);
  assert.equal(s.mem, 200e6); // usage minus page cache
  assert.equal(s.pids, 7);
  assert.deepEqual([s.blockRead, s.blockWrite], [10, 20]);
});

test('CPU % and network rates come from the previous sample', () => {
  const first = summarize({}, stats(1000, 10000, 500, 100), null, 0);
  const s = summarize({}, stats(1500, 12000, 2500, 1100), first.sample, 2000);
  assert.equal(s.cpu, 100); // 500 of 2000 system jiffies on 4 cpus
  assert.equal(s.rx, 1000); // 2000 bytes in 2 s
  assert.equal(s.tx, 500);
});
