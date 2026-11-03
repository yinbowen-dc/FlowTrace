const presets = {
  account: {task: 'account_inspect', label: '查看公开账户'},
  changes: {task: 'account_compare', label: '核对账户变化'},
  receipt: {task: 'payment_investigate', label: '核对历史收款'},
  limit: {task: 'transfer_preflight', label: '演示金额超限', overrides: {maxAmount: '0.001'}}
};

export function resolveDemo(location) {
  let url;
  try { url = new URL(location); } catch { return null; }
  const names = url.searchParams.getAll('demo');
  if (names.length !== 1 || !Object.hasOwn(presets, names[0])) return null;
  const key = names[0], preset = presets[key];
  return {key, task: preset.task, label: preset.label, overrides: {...preset.overrides}};
}

export function demoKeyForTask(task) {
  return Object.keys(presets).find(key => presets[key].task === task) ?? null;
}

export function demoLink(location, key) {
  if (!Object.hasOwn(presets, key)) return null;
  let url;
  try { url = new URL(location); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  url.search = '';
  url.searchParams.set('demo', key);
  url.hash = 'manual';
  return url.href;
}
