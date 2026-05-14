# GPT Codex 共享能力技术探索方案

## 1. 背景和目标

目标是探索一个可以让不同用户共享 Codex / GPT 计算能力的平台形态：

- 消费者通过平台 API 提交任务或请求。
- 贡献者贡献自己的可用模型能力。
- 平台负责请求接入、任务分发、流式响应、计量、结算、限流和风控。
- 第一版优先验证 GPT Codex 相关能力，未来可扩展到 Claude Code 或其他 coding agent。

经过讨论，方案需要区分两类能力：

- API capacity 共享：贡献者提供独立 API Key / service account / provider key，平台做标准 API 代理和路由。
- 本地 Codex worker 共享：贡献者在自己机器上运行 worker，本地 Codex 账号和认证状态不离开贡献者机器。

不建议把贡献者的 ChatGPT / Codex 登录态集中托管到平台服务器，再包装成多人 API 池。这条路径在工程上也很脆弱，主要风险包括登录态失效、设备授权变化、2FA、风控、IP/设备指纹、并发限制、配额不可控、协议频繁变化、请求级审计和撤销困难。

## 2. 推荐总体架构

```text
Consumer
  -> Platform API Gateway
  -> Auth / Rate Limit / Billing
  -> Router
  -> Job Queue
  -> Provider Adapter
      -> OpenAI API Provider
      -> Contributor Local Codex Worker
      -> Future Claude Code Worker
```

核心模块：

- Consumer API Gateway：对消费者暴露 API，负责消费者 API Key 鉴权、限流、请求校验和 SSE 流式响应。
- Router：按模型、能力、可用额度、健康状态、延迟、价格选择 provider 或 worker。
- Job Queue：Codex 类任务天然是长任务，内部建议使用异步 job 协议，而不是只按普通 chat completion 处理。
- Provider Adapter：屏蔽不同上游实现差异，第一版可以支持 OpenAI 官方 API 和本地 Codex worker。
- Contributor Portal：贡献者管理自己的供给能力、并发、额度、可用时间、收益和下线操作。
- Usage Ledger：记录消费者、贡献者、模型、token、请求耗时、成本、收入、失败和退款。
- Secret Manager：管理 provider API Key；本地 worker 模式下平台不接触贡献者 Codex 登录凭据。
- Admin Console：查看 worker 健康、失败率、异常请求、额度、结算和人工下线。

## 3. 两条可行产品路线

### 3.1 BYOK / Provider Key Pool

贡献者贡献的是独立 API Key 或 service account key，而不是 ChatGPT / Codex 登录态。

适合快速验证商业闭环：

- 平台实现 OpenAI-compatible API。
- 贡献者录入 API Key、模型白名单、日限额、月限额和并发限制。
- 平台按模型和额度路由到不同 provider key。
- 请求完成后基于 usage 做消费者扣费和贡献者收益计算。

优点：

- 架构简单。
- 请求级计量清楚。
- 容易限流、熔断和下线。
- 可以较快上线 MVP。

缺点：

- 不能验证 ChatGPT / Codex 订阅能力共享。
- 贡献者需要有可用于程序调用的 provider credential。

### 3.2 Contributor Local Codex Worker

贡献者在自己的电脑或服务器上运行 worker。平台只下发任务，不保存贡献者 Codex 账号、cookie、session、refresh token 或 `auth.json`。

推荐数据流：

```text
Consumer API
  -> Platform Gateway
  -> Job Queue
  -> wss:// Contributor Worker
  -> Local Sandbox
  -> Codex CLI / Codex App Server
  -> result stream back
```

关键原则：

- worker 主动通过 outbound WebSocket 连接平台，平台不主动连接用户本机端口。
- 本地 Codex 认证只存在贡献者机器。
- 每个 job 使用独立 workspace。
- 默认不挂载贡献者 home 目录、SSH key、浏览器 cookie 或项目目录。
- 默认不开放任意网络访问。
- 贡献者可以随时暂停、下线或限制并发。

## 4. Local Worker 运行 Codex 的方式

### 4.1 MVP：`codex exec`

每个 job 启动一次 `codex exec`，实现最简单。

示例：

```bash
codex exec \
  --json \
  --ephemeral \
  --cd "$WORKDIR" \
  --sandbox workspace-write \
  --ask-for-approval never \
  --model "$MODEL" \
  "$PROMPT"
```

参数含义：

- `--json`：输出 JSONL 事件，worker 可以解析并流式回传。
- `--ephemeral`：不持久化 session，适合多租户隔离和一次性任务。
- `--cd "$WORKDIR"`：把 Codex 限定到当前 job 的临时工作区。
- `--sandbox workspace-write`：只允许在 workspace 内写文件。
- `--ask-for-approval never`：非交互模式避免任务卡在人工审批。

worker 实现时应使用 `spawn` 参数数组，不要拼接 shell 字符串：

```ts
spawn("codex", [
  "exec",
  "--json",
  "--ephemeral",
  "--cd", workdir,
  "--sandbox", "workspace-write",
  "--ask-for-approval", "never",
  "--model", model,
  prompt,
])
```

适用场景：

- 快速 MVP。
- 一次性 coding / review / patch 任务。
- 不需要长期保持同一个 Codex session。

### 4.2 产品化：`codex app-server`

长期更适合使用 `codex app-server`，由 worker 通过 JSON-RPC 控制 Codex。

启动：

```bash
codex app-server --listen stdio://
```

典型流程：

```json
{"method":"initialize","id":1,"params":{"clientInfo":{"name":"codex-share-worker","title":"Codex Share Worker","version":"0.1.0"}}}
```

```json
{"method":"thread/start","id":2,"params":{"ephemeral":true,"model":"gpt-5.3-codex"}}
```

```json
{
  "method": "turn/start",
  "id": 3,
  "params": {
    "threadId": "thr_xxx",
    "cwd": "/tmp/codex-share/jobs/job_123",
    "input": [{"type": "text", "text": "用户请求内容"}],
    "sandboxPolicy": {
      "type": "workspaceWrite",
      "writableRoots": ["/tmp/codex-share/jobs/job_123"],
      "networkAccess": false
    },
    "approvalPolicy": "never"
  }
}
```

优势：

- 原生 thread / turn 模型。
- 更稳定的事件结构。
- 更适合流式 agent message、command output、patch、approval 和 usage。
- 可以实现更细粒度的权限代理。

注意：

- 不建议把 app-server WebSocket 直接暴露到公网或局域网。
- 推荐用 `stdio://`，由本地 worker 作为唯一控制方。

## 5. Worker 内部任务协议

平台对外可以兼容 OpenAI API，但内部建议用 job-based 协议。

下发任务：

```json
{
  "type": "job.assigned",
  "job_id": "job_123",
  "model": "gpt-5.3-codex",
  "prompt": "review this repo and suggest fixes",
  "workspace_archive_url": "https://example.com/workspaces/job_123.tar.gz",
  "timeout_seconds": 900,
  "network": false
}
```

worker 回传事件：

```json
{"type":"job.event","job_id":"job_123","event":{"kind":"agent_delta","text":"..."}}
{"type":"job.event","job_id":"job_123","event":{"kind":"command_output","text":"..."}}
{"type":"job.completed","job_id":"job_123","usage":{"input_tokens":123,"output_tokens":456},"result":"..."}
```

任务生命周期：

```text
queued
  -> assigned
  -> running
  -> streaming
  -> completed | failed | timeout | cancelled
```

## 6. Session 保持策略

`codex exec` 默认可以持久化 session，并支持 resume。

示例：

```bash
codex exec resume --last "继续刚才的任务"
```

或：

```bash
codex exec resume <SESSION_ID> "继续处理这个问题"
```

但如果使用 `--ephemeral`，则不会持久化 session。

MVP 建议默认使用 `--ephemeral`，由平台维护 conversation，把必要上下文重新拼进 prompt。原因：

- 本地 Codex session 存在贡献者机器上，不方便跨 worker 路由。
- 同一消费者如果要续 session，必须粘到同一个 worker。
- 多租户隔离更复杂。
- session 文件清理、TTL、审计和撤销都要额外实现。

如果确实需要保留 session，平台需要维护映射：

```text
platform_conversation_id
  -> contributor_worker_id
  -> local_codex_session_id
  -> workspace_path
  -> expires_at
```

约束：

- 一个 platform conversation 固定路由到同一个 worker。
- 每个 conversation 一个独立 workspace。
- 设置 TTL，例如 30 分钟或 24 小时。
- 用户主动结束时，worker 删除 session 和 workspace。
- worker 重启后上报可恢复的 local session 列表。

长期需要多轮会话时，优先使用 `codex app-server` 的 thread / turn 模型。

## 7. 同一服务器多 Codex 账号隔离

结论：`--profile` 不能用于隔离账号。

`--profile` 只是在同一个 `config.toml` 中选择不同配置，例如 model、sandbox、approval、provider。真正决定认证状态的是 `CODEX_HOME` 下的认证缓存，或系统 keyring。

同一账号、不同配置：

```bash
codex exec --profile fast-review "..."
codex exec --profile strict-sandbox "..."
```

不同账号、不同认证状态：

```bash
CODEX_HOME=/srv/codex-accounts/account_a \
codex exec --json --cd /tmp/job_a --sandbox workspace-write "..."
```

```bash
CODEX_HOME=/srv/codex-accounts/account_b \
codex exec --json --cd /tmp/job_b --sandbox workspace-write "..."
```

每个 `CODEX_HOME` 应独立保存：

```text
config.toml
auth.json
sessions/
logs/
```

为了避免系统 keyring 带来的混淆，可以在每个 `CODEX_HOME/config.toml` 中明确使用文件凭据：

```toml
cli_auth_credentials_store = "file"
sandbox_mode = "workspace-write"
approval_policy = "never"
```

生产上更稳的隔离方式：

```text
codex-worker-a -> /home/codex-worker-a/.codex
codex-worker-b -> /home/codex-worker-b/.codex
codex-worker-c -> /home/codex-worker-c/.codex
```

每个 worker 使用：

- 独立 OS user。
- 独立 `CODEX_HOME`。
- 独立 job workspace 根目录。
- 独立并发限制。
- 独立 quota 和 health 状态。
- 独立 session 和 log 目录。

执行示例：

```bash
sudo -u codex-worker-a \
  CODEX_HOME=/home/codex-worker-a/.codex \
  codex exec --json --ephemeral --cd /srv/jobs/job_123 --sandbox workspace-write "..."
```

如果是贡献者模式，仍然更推荐贡献者本地跑 worker，而不是平台集中托管多个贡献者账号。这样平台不接触账号凭据，隔离、撤销和安全边界更清楚。

## 8. 本地沙盒分层

### 8.1 基础隔离

- 每个 job 一个临时 workspace。
- `--sandbox workspace-write`。
- 默认 `--ephemeral`。
- 默认不继承不必要的环境变量。
- 超时后 kill 进程组。
- job 完成后清理 workspace。

### 8.2 强隔离

在 Codex sandbox 外再包一层系统级 sandbox：

- rootless Docker / Podman。
- macOS sandbox-exec 或独立用户。
- Firecracker / Kata 等 microVM。
- 只挂载 job workspace。
- CPU / memory / disk quota。
- 禁止 privileged。
- 只允许访问平台和必要 provider 域名。

### 8.3 权限审批

MVP 可以使用 `approval_policy = never`，避免无人值守任务卡住。

产品化后可以引入本地 approval UI：

- 低风险读操作自动允许。
- 写 workspace 自动允许。
- 访问网络、读取额外目录、执行高风险命令需要贡献者确认。
- worker 可以把 approval request 转成本地桌面通知或 Web UI 弹窗。

## 9. 最小 MVP 范围

建议先做 Local Worker 版异步任务市场，而不是完整 OpenAI-compatible streaming API。

MVP API：

```text
POST /codex/jobs
GET  /codex/jobs/:id/events
GET  /codex/jobs/:id/result
POST /workers/connect
```

MVP 能力：

- 贡献者安装并启动 worker。
- worker 通过 outbound WebSocket 连接平台。
- 平台下发 prompt 和 workspace archive。
- worker 创建临时 workspace。
- worker 执行 `codex exec --json --ephemeral --sandbox workspace-write`。
- worker 解析 JSONL 事件并回传。
- 平台向消费者流式展示 agent delta 和最终结果。
- 平台记录耗时、状态、usage、失败原因和贡献者收益。

第一版不做：

- 不集中托管贡献者 Codex 登录态。
- 不上传 `~/.codex/auth.json`。
- 不暴露本地 app-server 到公网。
- 不允许消费者指定读取本机任意路径。
- 不让消费者直接控制 shell command。
- 不使用 `danger-full-access`。
- 不默认保留跨用户 session。

## 10. 数据模型草案

```text
users(
  id,
  role,
  status,
  created_at
)

consumer_api_keys(
  id,
  user_id,
  key_hash,
  status,
  created_at
)

contributor_workers(
  id,
  user_id,
  status,
  version,
  capabilities,
  max_concurrency,
  current_jobs,
  last_seen_at
)

worker_sessions(
  id,
  worker_id,
  platform_conversation_id,
  local_session_id,
  workspace_ref,
  expires_at
)

jobs(
  id,
  consumer_id,
  worker_id,
  model,
  status,
  prompt_ref,
  workspace_ref,
  timeout_seconds,
  created_at,
  started_at,
  finished_at
)

job_events(
  id,
  job_id,
  seq,
  kind,
  payload,
  created_at
)

usage_records(
  id,
  job_id,
  consumer_id,
  contributor_id,
  model,
  input_tokens,
  output_tokens,
  duration_ms,
  cost_amount,
  revenue_amount
)

ledger_entries(
  id,
  user_id,
  job_id,
  type,
  amount,
  created_at
)
```

## 11. 后续演进路线

阶段 1：`codex exec` MVP

- 验证 worker 连接、任务分发、流式事件、结果回传、超时和清理。
- 不保留 session。
- 不做复杂审批。

阶段 2：多 worker 调度和结算

- worker health check。
- 并发和限额。
- 贡献者收益账本。
- 消费者余额和限流。
- 失败重试和熔断。

阶段 3：`codex app-server`

- thread / turn 状态管理。
- 更完整的事件模型。
- approval flow。
- patch / diff / artifact 管理。

阶段 4：多 provider

- OpenAI API key pool。
- Codex local worker。
- Claude Code local worker。
- provider 统一路由和结算。

## 12. Cloudflare Web MVP

新增 Web 控制台采用 Cloudflare + Next.js + OpenNext 形态，页面风格和工程结构参考 `/Users/bytedance/workdir/chatuos`：

```text
Next.js App Router
  -> OpenNext Cloudflare adapter
  -> Cloudflare Worker runtime
  -> D1 database
  -> GitHub OAuth via NextAuth
```

核心页面全部使用英文：

- Landing：介绍 Consumer API、Contributor Worker、Credit Ledger。
- Login：只允许 GitHub 登录。
- Dashboard：登录后的主控制台。

Dashboard 分为三个卡片/视图：

1. Consumer
   - 展示用户专属 GPT 配置。
   - 包括平台 endpoint、API key、model、环境变量和 cURL 示例。
   - 支持一键复制配置。

2. Contributor
   - 展示贡献者 worker 配置。
   - 展示用户 ID、平台 endpoint、worker key、worker 启动命令。
   - 提供下载 worker bootstrap 配置的入口。
   - worker 下载后，用户可以在本地 `plans.json` 中配置一个或多个 Codex 账户共享计划。

3. Settings
   - 显示唯一用户 ID。
   - 显示积分余额。
   - 支持创建多个 API key。
   - API key 可用于 Consumer 请求或 Contributor worker。
   - 后续接入人工充值、消费扣减、贡献奖励和账本明细。

当前项目骨架中的关键路径：

```text
src/app/page.tsx                         # English landing page
src/app/login/page.tsx                   # GitHub login page
src/app/dashboard/page.tsx               # Authenticated dashboard
src/components/dashboard/dashboard-tabs.tsx
src/components/dashboard/api-key-manager.tsx
src/app/api/api-keys/route.ts            # API key create/list
src/app/api/api-keys/[id]/route.ts       # API key revoke
src/app/api/gpt/v1/responses/route.ts    # GPT gateway scaffold
src/app/api/gpt/v1/chat/completions/route.ts
src/app/api/worker/bootstrap/route.ts    # Personalized worker bootstrap download
src/app/api/worker/poll/route.ts         # Worker polling scaffold
src/app/api/worker/events/route.ts       # Worker event ingestion scaffold
worker/                                 # Python contributor worker
```

## 13. Web 数据模型

Web MVP 新增或落地以下数据模型：

```text
users
accounts
sessions
verification_tokens
authenticators
api_keys
wallets
ledger_entries
worker_plans
```

核心关系：

```text
users.id
  -> api_keys.user_id
  -> wallets.user_id
  -> ledger_entries.user_id
  -> worker_plans.user_id
```

API key 设计：

- key 明文只在创建时展示一次。
- 数据库只保存 SHA-256 hash 和可见 prefix。
- key purpose 支持 `consumer`、`contributor`、`both`。
- Consumer 和 Contributor Worker 均使用 `Authorization: Bearer <key>`。

积分设计：

- 贡献 GPT：增加 credits。
- 消费 GPT：减少 credits。
- 手动充值：增加 credits。
- 所有变更进入 `ledger_entries`。
- 当前骨架已包含 `wallets` 和 `ledger_entries` 表，结算逻辑后续接入 job 完成事件。

## 14. Worker Download 和多计划配置

贡献者卡片提供下载 worker bootstrap 的入口：

```text
GET /api/worker/bootstrap
```

该接口基于当前 GitHub 登录用户生成 shell bootstrap：

- 写入平台 endpoint。
- 写入用户 ID。
- 生成 `plans.json` 模板。
- 提示用户通过 `GPT_PROXY_WORKER_KEY` 注入完整 API key。

本地 worker 使用 Python，目录：

```text
worker/
  pyproject.toml
  plans.example.json
  codex_share_worker/
    __main__.py
    client.py
    codex_runner.py
    config.py
```

worker MVP 使用 HTTP long polling，保持最大兼容性，不引入第三方依赖：

```text
worker -> POST /api/worker/poll
worker -> POST /api/worker/events
```

每个 plan 可以指定：

```json
{
  "name": "default-codex-plan",
  "model": "gpt-5.3-codex",
  "codex_home": "~/.codex",
  "workspace_root": "~/.gpt-proxy/jobs",
  "max_concurrency": 1
}
```

多账号贡献方式：

- 同一个 worker 可以加载多个 plan。
- 每个 plan 指向不同 `CODEX_HOME`。
- 更强隔离时，建议一个 OS user 跑一个 worker 进程。
- 平台侧后续可按 plan、worker、健康状态和积分收益进行调度。

## 15. Cloudflare 配置原则

当前骨架采用：

```text
wrangler.jsonc
  main = .open-next/worker.js
  compatibility_date = 2026-05-14
  compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]
  D1 binding = DB
  observability.enabled = true
```

需要通过 Cloudflare secrets 配置：

```text
AUTH_SECRET
AUTH_GITHUB_ID
AUTH_GITHUB_SECRET
```

非 secret 配置：

```text
AUTH_URL
PUBLIC_APP_URL
```

部署前步骤：

```text
npm install
npm run cf-typegen
npm run db:migrate:remote
npm run deploy
```

## 16. 当前 MVP 边界

已初始化：

- Cloudflare/Next.js 项目骨架。
- GitHub 登录接入结构。
- 英文 Landing/Login/Dashboard。
- Consumer/Contributor/Settings 三卡片切换。
- API key 创建、列出、撤销接口。
- wallet 初始积分结构。
- GPT gateway route scaffold。
- worker poll/event route scaffold。
- Python worker scaffold。
- D1 初始 migration。

尚未实现：

- worker job queue 存储。
- GPT 请求到 worker job 的真实调度。
- SSE 事件从 worker 到 consumer 的实时桥接。
- credits 的真实扣减和奖励。
- 充值支付。
- worker plan 的服务端持久化和健康检查。
- consumer 请求的模型路由、熔断和重试。

## 17. 参考资料

- OpenAI Codex CLI reference: https://developers.openai.com/codex/cli/reference
- Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- Codex app-server: https://developers.openai.com/codex/app-server
- Codex sandboxing: https://developers.openai.com/codex/concepts/sandboxing
- Codex authentication: https://developers.openai.com/codex/auth
- Cloudflare Workers best practices: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
