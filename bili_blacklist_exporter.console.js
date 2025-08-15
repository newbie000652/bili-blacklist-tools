// 黑名单页面 https://account.bilibili.com/account/blacklist
(async () => {
  if (!confirm('此脚本将从 B 站 API 拉取并仅在本地保存你的黑名单为 JSON 文件。请确认你已在本浏览器登录 B 站。继续？')) return;
  // 【安全提示】再次确认，避免误用
  if (!confirm('再次确认：本脚本只会在本地触发文件下载。确认继续？')) return;

  try {
    const PS = 20;
    const BASE = 'https://api.bilibili.com/x/relation/blacks?re_version=0&jsonp=jsonp&web_location=333.33';
    const sleep = ms => new Promise(r=>setTimeout(r, ms));
    let pn = 1, all = [], total = Infinity;
    while (all.length < total) {
      const res = await fetch(`${BASE}&pn=${pn}&ps=${PS}`, { credentials: 'include', headers: { 'Referer':'https://account.bilibili.com' }});
      if (!res.ok) throw new Error('请求失败 ' + res.status);
      const j = await res.json();
      if (j.code !== 0) throw new Error('接口返回 code=' + j.code);
      const list = j.data.list || [];
      total = typeof j.data.total === 'number' ? j.data.total : total;
      all = all.concat(list);
      console.log(`页 ${pn}：${list.length} 条，累计 ${all.length}/${total}`);
      if (!list.length) break;
      pn++;
      await sleep(200);
    }

    const simplified = all.map(it => {
      const m = it.mtime || 0;
      return {
        mid: it.mid,
        uname: it.uname,
        face: it.face,
        sign: it.sign,
        attribute: it.attribute,
        mtime_unix: m,
        mtime_iso: m ? new Date(m*1000).toISOString().replace('T',' ').slice(0,19) : ''
      };
    });

    const filename = `bili_blacklist_safe_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    const blob = new Blob([JSON.stringify(simplified, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    console.log('导出完成（本地下载）：', filename);
  } catch (e) {
    console.error('导出过程中发生错误：', e);
  }
})();
