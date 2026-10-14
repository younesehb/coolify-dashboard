import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpuTimes, memInfo, netTotals } from './metrics.js';

test('cpuTimes sums jiffies and counts cores', () => {
  const t = cpuTimes('cpu  100 0 50 800 50 0 0 0 0 0\ncpu0 50 0 25 400 25 0 0 0 0 0\ncpu1 50 0 25 400 25 0 0 0 0 0\nintr 1');
  assert.deepEqual(t, { idle: 850, total: 1000, cores: 2 });
});

test('memInfo uses MemAvailable for used memory', () => {
  const m = memInfo('MemTotal:       16000 kB\nMemFree:  1000 kB\nMemAvailable:    6000 kB\nSwapTotal: 2000 kB\nSwapFree: 1500 kB\n');
  assert.equal(m.total, 16000 * 1024);
  assert.equal(m.used, 10000 * 1024);
  assert.equal(m.swapUsed, 500 * 1024);
});

test('netTotals skips loopback and container interfaces', () => {
  const dev = `Inter-|   Receive |  Transmit
 face |bytes packets errs drop fifo frame compressed multicast|bytes packets errs drop fifo colls carrier compressed
    lo: 999 1 0 0 0 0 0 0 999 1 0 0 0 0 0 0
  eth0: 1000 1 0 0 0 0 0 0 400 1 0 0 0 0 0 0
docker0: 555 1 0 0 0 0 0 0 555 1 0 0 0 0 0 0
vethab12: 777 1 0 0 0 0 0 0 777 1 0 0 0 0 0 0
  ens3: 24 1 0 0 0 0 0 0 6 1 0 0 0 0 0 0`;
  assert.deepEqual(netTotals(dev), { rx: 1024, tx: 406 });
});
