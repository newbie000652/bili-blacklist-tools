// 自动获取 bili_jct
function getBiliJct() {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('bili_jct='))
        ?.split('=')[1] || '';
}

let bili_jct = getBiliJct();

if (!bili_jct) {
    console.error("未能自动获取 bili_jct，请确认脚本运行在 https://account.bilibili.com/ 或 https://www.bilibili.com/ 域下");
} else {
    console.log("已自动获取 bili_jct:", bili_jct);
}

(async () => {
  // 配置
  const CHECK_EXISTING = true;
  const DELAY_MS = 3000;
  const RETRY = 2;
  const ACTION_ADD = '5';

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
  function nowName(){ return `bili_blacklist_import_result_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`; }
  function downloadJSON(filename, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  }

  function readCsrfFromCookie(){
    const m = document.cookie.match(/(?:^|;)\\s*bili_jct=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  // 选择并读取文件
  const file = await new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => resolve(input.files[0]);
    input.click();
  });
  if (!file) { console.log('未选择文件，已退出。'); return; }
  let raw;
  try { raw = await file.text(); } catch (e){ console.error('读取文件失败：', e); return; }
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e){ console.error('解析 JSON 失败：', e); return; }

  // 解析 UID 列表（兼容多种结构）
  let uids = [];
  if (Array.isArray(parsed)) {
    if (parsed.length && (typeof parsed[0] === 'number' || typeof parsed[0] === 'string')) {
      uids = parsed.map(x => String(x).trim()).filter(Boolean);
    } else {
      uids = parsed.map(o => (o && (o.mid || o.id || o.uid)) ? String(o.mid || o.id || o.uid) : null).filter(Boolean);
    }
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.data?.list)) uids = parsed.data.list.map(it => String(it.mid)).filter(Boolean);
    else { console.error('无法识别 JSON 结构，请使用 ["mid",...] 或 [{"mid":...},...] 或 API 原始响应 data.list。'); return; }
  } else { console.error('不支持的 JSON 结构。'); return; }

  if (!uids.length) { console.error('未解析出任何 UID'); return; }
  console.log(`解析出 ${uids.length} 个 UID，将开始处理（间隔 ${DELAY_MS}ms）。`);

  // 检查是否已拉黑
  async function isBlocked(uid){
    try {
      const resp = await fetch(`https://api.bilibili.com/x/relation?fid=${encodeURIComponent(uid)}`, { credentials: 'include' });
      if (!resp.ok) return false;
      const j = await resp.json();
      return j && j.data && (j.data.attribute === 128);
    } catch (e){
      console.warn('检测已拉黑失败：', uid, e);
      return false;
    }
  }

  // 发起拉黑请求（**重要：不带自定义 x-* 头，避免触发 CORS 预检**）
  async function doBlock(uid){
    const url = 'https://api.bilibili.com/x/relation/modify';
    for (let attempt=0; attempt<=RETRY; attempt++){
      const csrf = readCsrfFromCookie() || (window.__TMP_BILI_JCT__ || '');
      if (!csrf) {
        // 交互式提示一次
        const pasted = prompt('未检测到 bili_jct（CSRF）。请从 DevTools → Application → Cookies 中复制 bili_jct 值并粘贴（仅本地使用）：');
        if (pasted) {
          window.__TMP_BILI_JCT__ = pasted.trim();
        } else {
          return { ok:false, error:'missing_csrf' };
        }
      }
      const usedCsrf = readCsrfFromCookie() || window.__TMP_BILI_JCT__;
      const body = new URLSearchParams({ fid: uid, act: ACTION_ADD, csrf: usedCsrf }).toString();
      try {
        const resp = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded' // <-- 不要加入自定义 x-* 头
          },
          body
        });
        const text = await resp.text();
        let j;
        try { j = JSON.parse(text); } catch(e){ j = { code: resp.status, raw: text }; }
        if (j && j.code === 0) {
          console.log(`拉黑 ${uid} 成功（attempt ${attempt+1}）。`);
          return { ok:true, data:j };
        }
        if (j && j.code === -111) {
          console.warn(`UID ${uid} 返回 -111（csrf 校验），等待重试（attempt ${attempt+1}）。`);
          await sleep(1000 + 800*attempt);
          continue;
        }
        console.error(`UID ${uid} 返回错误：`, j);
        return { ok:false, error:j };
      } catch (e){
        console.warn(`拉黑 ${uid} 请求异常（attempt ${attempt+1}）：`, e);
        // 如果是 CORS 导致的 Failed to fetch，这里会捕获 TypeError
        if (attempt < RETRY) await sleep(800*(attempt+1));
        else return { ok:false, error:e };
      }
    }
    return { ok:false, error:'max_retries' };
  }

  // 主循环
  const results = [];
  for (let i=0;i<uids.length;i++){
    const uid = String(uids[i]);
    console.log(`(${i+1}/${uids.length}) 处理 UID=${uid} ...`);
    let already = false;
    if (CHECK_EXISTING) {
      try { already = await isBlocked(uid); } catch(e) { already = false; }
    }
    if (already) {
      console.log(`UID ${uid} 已在黑名单，跳过。`);
      results.push({ uid, status: 'skipped_already_blocked' });
    } else {
      const r = await doBlock(uid);
      if (r.ok) results.push({ uid, status:'blocked', raw:r.data });
      else results.push({ uid, status:'failed', error:r.error });
    }
    await sleep(DELAY_MS);
  }

  downloadJSON(nowName(), { timestamp: new Date().toISOString(), attempted: uids.length, results });
  console.log('全部完成，结果已下载本地文件。');
})();
