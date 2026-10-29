/** V2 功能开关：默认关闭，不影响 V1 闭环。调试可 localStorage.setItem('bm_v2','1') */
export function isV2Enabled(): boolean {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('v2') === '1') return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('bm_v2') === '1') return true;
  } catch { /* ignore */ }
  return false;
}
