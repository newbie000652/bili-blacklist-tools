# B 站黑名单导出 / 导入 / 合并 小工具

> 三个工具
>
> * **bili\_blacklist\_exporter.console.js** — 在 B 站黑名单页面（Console）运行，导出 `simplified` JSON。
> * **bili\_blacklist\_importer.console.js** — 在 B 站网站（Console）运行，读取 JSON 并批量拉黑 UID（调用 B 站 API）。
> * **bili\_blacklist\_merge.local.html** — 本地打开的合并页面，支持混合格式识别、并/交/差集合并、导出多种兼容格式（可再次合并 / 可导入 / 纯 UID 列表）。

---

## 目录

- [B 站黑名单导出 / 导入 / 合并 小工具](#b-站黑名单导出--导入--合并-小工具)
  - [目录](#目录)
  - [快速开始](#快速开始)
  - [导出工具 — bili\_blacklist\_exporter.console.js](#导出工具--bili_blacklist_exporterconsolejs)
  - [导入工具 — bili\_blacklist\_importer.console.js](#导入工具--bili_blacklist_importerconsolejs)
  - [合并工具 — bili\_blacklist\_merge.local.html](#合并工具--bili_blacklist_mergelocalhtml)
  - [支持的文件格式（互操作）](#支持的文件格式互操作)
  - [典型工作流示例](#典型工作流示例)
  - [常见问题与故障排查](#常见问题与故障排查)
  - [安全与隐私](#安全与隐私)

---

## 快速开始

1. 下载仓库（或把三个文件放在本地）。
2. 在浏览器中打开 B 站黑名单页面：`https://account.bilibili.com/account/blacklist` 并登录。
3. 打开浏览器开发者工具 → Console，将 `bili_blacklist_exporter.console.js` 的内容粘贴并回车，触发导出文件下载。
4. 在合并场景下，用 `bili_blacklist_merge.local.html` 打开合并器页面（双击或用浏览器打开），加载或粘贴你要合并的 JSON 文件，点击“合并并预览”，选择下载格式（`meta+items` / `导入兼容(export)` / `uids`）。
5. 想要批量拉黑时，打开 `https://account.bilibili.com` 或 `https://www.bilibili.com`（确保同一域），在 Console 粘贴并运行 `bili_blacklist_importer.console.js`，选择文件并按提示执行（脚本会尝试自动读取 `bili_jct`，若失败会提示手动输入）。

---

## 导出工具 — bili\_blacklist\_exporter.console.js

**用途**：分页调用 B 站黑名单 API，把你的黑名单导出为本地 JSON（`simplified` 格式，含 `mid`、`uname`、`mtime_iso` 等）。

**如何运行（步骤）**：

1. 打开 `https://account.bilibili.com/account/blacklist`（已登录）。
2. 打开开发者工具 → Console。
3. 将 `bili_blacklist_exporter.console.js` 的代码粘贴进去并运行。
4. 脚本会分页拉取并触发本地下载，生成文件名类似：
   `bili_blacklist_safe_2024-12-13-03-51-39.json`

**输出示例（simplified）**：

```json
[
  {
    "mid": 11030320631,
    "uname": "示例用户名",
    "face": "https://i2.hdslb.com/…jpg",
    "sign": "示例签名",
    "attribute": 128,
    "mtime_unix": 1734061899,
    "mtime_iso": "2024-10-13 07:51:39"
  }
]
```

---

## 导入工具 — bili\_blacklist\_importer.console.js

**用途**：读取 JSON（支持多种结构），并通过 B 站 API 批量将 UID 加入黑名单（`/x/relation/modify`）。

**如何运行（步骤）**：

1. 在 `https://account.bilibili.com` 或 `https://www.bilibili.com` 打开开发者工具 → Console。
2. 将 `bili_blacklist_importer.console.js` 的代码粘贴并运行。
3. 脚本会弹出文件选择器，选择你准备好的 JSON 文件（可为导出脚本生成的 `simplified`、合并器导出的 `export`、或纯 UID 列表等）。
4. 若脚本无法自动读取 `bili_jct`（CSRF），会提示你手动粘贴 `bili_jct`（从 DevTools → Application → Cookies 中复制）。
5. 脚本会逐个处理 UID，可配置延迟与重试；完成后会自动下载处理结果 JSON（包含每个 UID 的状态）。

**注意**：

* 推荐在 B 站站内运行脚本以减小 CORS/凭证问题。
* 若出现 `-111` 错误，多为 CSRF（`bili_jct`）问题；按提示手动粘贴或刷新 Cookie 后重试。

---

## 合并工具 — bili\_blacklist\_merge.local.html

**用途**：本地打开的合并页面，用于合并来自不同来源/格式的黑名单文件，输出三种可选格式（便于再次合并或直接导入）。

**使用方式**：

1. 用浏览器打开 `bili_blacklist_merge.local.html`（无需服务端）。
2. 通过“选择文件”/拖放/粘贴 JSON 加载一个或多个文件。支持混合格式。
3. 选择合并模式：`并集 (union)` / `交集 (intersection)` / `差集 (difference：第1个 - 其它)`。
4. 选择冲突策略：`merge / latest / earliest / preferFirst`。
5. 点击“合并并预览”查看结果与统计。
6. 点击“下载合并 JSON”，弹窗选择下载格式：

   * `合并标准（meta+items）`：保留完整信息，适合再次合并；
   * `导入兼容（export）`：生成 `simplified` 数组，可直接用导入脚本导入；
   * `纯 UID 列表（uids）`：纯 ID 列表，便于快速复制或导入。
7. 还可导出 CSV (`uid,primary_uname`) 或“一键复制 UID（换行）”。

**合并器会生成**：

* `mergedPayload.meta`，`mergedPayload.items`（详尽记录）
* `mergedPayload.export`（simplified）
* `mergedPayload.uids`（纯 ID 列表）

---

## 支持的文件格式（互操作）

合并器 / 导入器均支持下列常见格式：

1. **simplified（导出脚本生成）**
   `[{ mid, uname, face?, sign?, attribute?, mtime_unix, mtime_iso }, ...]`
2. **API 原始响应**
   `{ data: { list: [ { mid, uname, mtime, ... }, ... ], total: N } }`
3. **合并器标准（内部）**
   `{ meta: {...}, items: [ { uid, primary_uname, unames[], added_at_first, added_at_last, ... }, ... ] }`
4. **纯 UID 列表**
   `[123, "456", 789, ...]`

> 合并器会把任意支持格式统一转换为 `items`，并在合并后输出多种格式，确保能再次合并或直接导入。

---

## 典型工作流示例

**场景：合并来自 A、B 两个导出的 JSON 并导入 B 站黑名单**

1. 在 B 站 A 账号上运行 `bili_blacklist_exporter.console.js`，得到 `a_export.json`。
2. 在 B 站 B 账号上运行同脚本，得到 `b_export.json`（或别人发来的 `b_export.json`）。
3. 打开 `bili_blacklist_merge.local.html`，加载 `a_export.json` 和 `b_export.json`，选择 `并集` + 冲突策略（如 `merge`），点击合并。
4. 下载合并结果，选择 **导入兼容（export）** 格式，保存为 `merged_for_import.json`。
5. 在要导入目标的浏览器（已登录目标账号）打开 `bili_blacklist_importer.console.js`，选择 `merged_for_import.json` 并运行导入。
6. 检查导入结果 JSON（脚本会下载 `bili_blacklist_import_result_*.json`），确认成功条目与失败条目。

---

## 常见问题与故障排查

* **脚本报 `-111`（CSRF 失败）**

  * 原因：`bili_jct` 不存在或无效。解决：从浏览器 Cookie 中复制 `bili_jct` 并按脚本提示粘贴，或在 B 站页面刷新登录状态后重试。
* **出现 `Failed to fetch` / TypeError（可能是 CORS）**

  * 建议在 `https://account.bilibili.com` 或 `https://www.bilibili.com` 页面内运行导入脚本，确保 `credentials: 'include'` 能带上 Cookie。
* **合并后的 `mtime_iso` 解析异常**

  * 脚本使用 `Date.parse` 或 `new Date(...)` 解析时间，`"YYYY-MM-DD HH:MM:SS"` 在个别环境可能解析不一致。若发现时间顺序错误，建议将时间格式改为 `YYYY-MM-DDTHH:MM:SS`（带 `T`）或在合并前标准化时间。
* **导出文件中 `face` / `sign` 显示为 `null`**

  * 这是合并器在没有可靠来源时的保守处理；导入脚本并不依赖这些字段进行拉黑，仅使用 `mid`。如需保留这些字段，请在合并时保留原始值。

---

## 安全与隐私

* **所有合并 / 导出操作均在本地浏览器执行**（不上传到第三方服务器）。导入工具会调用 B 站 API 将指定 UID 加入黑名单——这一步会向 B 站服务器发送请求。
* **不要把 `bili_jct` 或 Cookie 信息贴到不受信任的地方**。若脚本提示手动粘贴 `bili_jct`，仅在本地、信任环境下操作。
* 导出的文件包含用户 ID（mid），请谨慎处理与共享。
