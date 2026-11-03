import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDemo, demoKeyForTask, demoLink} from '../public/agent/demo-routes.js';

test('share links round-trip all four fixed examples under a deployment prefix', () => {
  for (const [key, task] of Object.entries({account: 'account_inspect', changes: 'account_compare', receipt: 'payment_investigate', limit: 'transfer_preflight'})) {
    const link = demoLink('https://example.org/collect/agent/?privateOrder=123#chat', key);
    assert.equal(link, `https://example.org/collect/agent/?demo=${key}#manual`);
    assert.equal(resolveDemo(link).task, task);
    assert.equal(demoKeyForTask(task), key);
  }
});

test('unknown, repeated and malformed preset names cannot select arbitrary tasks', () => {
  for (const query of ['', '?demo=', '?demo=constructor', '?demo=__proto__', '?demo=toString', '?demo=send_transaction', '?demo=changes&demo=limit', '?demo=%00changes']) {
    assert.equal(resolveDemo('https://example.org/agent/' + query), null, query);
  }
  assert.equal(resolveDemo('not a URL'), null);
  assert.equal(demoKeyForTask('send_transaction'), null);
});

test('URL fields do not override the fixed public example or amount limit', () => {
  const demo = resolveDemo('https://example.org/agent/?demo=limit&maxAmount=999&accountId=private.near&url=https://evil.example');
  assert.deepEqual(demo.overrides, {maxAmount: '0.001'});
  assert.equal(demo.task, 'transfer_preflight');
  demo.overrides.maxAmount = '999';
  assert.equal(resolveDemo('https://example.org/agent/?demo=limit').overrides.maxAmount, '0.001');
});

test('copying a demo drops query fields and accepts only web page URLs', () => {
  const link = demoLink('http://127.0.0.1:8804/agent/?accountId=private.near&txHash=sensitive#chat', 'receipt');
  assert.equal(link, 'http://127.0.0.1:8804/agent/?demo=receipt#manual');
  assert.equal(demoLink('javascript:alert(1)', 'limit'), null);
  assert.equal(demoLink('file:///tmp/page.html', 'account'), null);
  assert.equal(demoLink('not a URL', 'changes'), null);
  assert.equal(demoLink('https://example.org/', 'unknown'), null);
});
