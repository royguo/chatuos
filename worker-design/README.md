# ChatUOS Worker 具体实现方案

这个目录用于单独管理 Contributor Worker 的实现方案、协议设计和后续里程碑。
运行时代码仍放在 `worker/` 目录中。

## 目标

Worker 运行在贡献者本机，负责从 ChatUOS 平台轮询任务、调用本机 Codex
执行任务，并把结构化事件回传给平台。Codex 登录态和凭证只保存在本机每个
profile 的 `codex_home` 中，不上传到 ChatUOS。

## 运行配置

默认配置文件路径：

```text
~/.chatuos/settings.json
```

默认启动命令：

```bash
python -m codex_share_worker --configs ~/.chatuos/settings.json
```

配置结构：

```json
{
  "endpoint": "https://chatuos.com",
  "user_id": "user_id_from_dashboard",
  "worker_key": "chatuos_full_api_key",
  "plans": [
    {
      "name": "default-codex",
      "model": "gpt-5.3-codex",
      "codex_home": "~/.codex",
      "workspace_root": "~/.chatuos/jobs/default-codex",
      "max_concurrency": 1
    }
  ]
}
```

## 核心模块

1. 配置加载器
   - 读取 `--configs` 指定的 JSON 文件。
   - 展开 `~` 路径。
   - 校验 endpoint、worker key 和至少一个 profile。
   - 支持多个 profile，每个 profile 使用独立 `codex_home`。

2. 平台客户端
   - 使用 API key 发送 bearer-authenticated 请求。
   - 通过 `/api/worker/poll` 上报 active profiles 和本地可用容量。
   - 通过 `/api/worker/events` 上报任务生命周期、日志和完成状态。
   - 对临时网络错误做 retry/backoff。

3. Worker supervisor
   - 管理主轮询循环。
   - 按 profile 跟踪本机容量。
   - 严格执行每个 profile 的 `max_concurrency`。
   - 维护 idle、busy、unhealthy、stopped 等本地状态。

4. Job runner
   - 为每个任务创建独立 workspace。
   - 用选中 profile 的 `CODEX_HOME` 启动 Codex。
   - 将 stdout/stderr 和结构化事件回传平台。
   - 上报 exit code、耗时和错误摘要。

5. 本地状态
   - 默认写入 `~/.chatuos/runtime/`。
   - 保存每个 job 的调试日志。
   - 记录 in-flight job id，用于 worker 中断后的恢复或补偿上报。

## Poll 协议

Worker 请求：

```json
{
  "plans": [
    {
      "name": "default-codex",
      "model": "gpt-5.3-codex",
      "codex_home": "/Users/name/.codex",
      "workspace_root": "/Users/name/.chatuos/jobs/default-codex",
      "max_concurrency": 1
    }
  ]
}
```

无任务响应：

```json
{
  "type": "no_job",
  "profiles_seen": 1
}
```

未来任务分配响应：

```json
{
  "type": "job.assigned",
  "job_id": "job_...",
  "plan": "default-codex",
  "model": "gpt-5.3-codex",
  "input": "Run the requested task",
  "metadata": {}
}
```

## Event 协议

Worker 通过 `POST /api/worker/events` 上报事件：

```json
{
  "job_id": "job_...",
  "event": {
    "kind": "job.log",
    "stream": "stdout",
    "text": "..."
  },
  "sent_at": 1778720000
}
```

核心事件类型：

- `job.started`
- `job.log`
- `job.progress`
- `job.completed`
- `job.failed`
- `worker.unhealthy`

## 实现阶段

1. 配置和命令统一
   - 正式使用 `--configs`。
   - 默认配置路径为 `~/.chatuos/settings.json`。
   - 保持 installer、Dashboard、文档和 CLI 一致。

2. Profile 健康状态
   - 将 profile check-in 持久化到 D1。
   - Dashboard 展示 active profiles 和 last request time。
   - 增加超时下线和 inactive 状态。

3. Job leasing
   - 新增任务队列表。
   - 按 profile 容量、模型和健康状态分配任务。
   - 给 job lease 设置过期时间和 retry count。

4. Codex 执行
   - 创建 per-job workspace。
   - 使用 profile 专属 `CODEX_HOME` 运行 Codex subprocess。
   - 流式上报任务日志和进度事件。

5. 可靠性
   - 增加指数退避。
   - 恢复中断任务。
   - 限制日志大小和任务最长运行时间。

6. 可观测性
   - 上报 worker version、profile health、last error 和 current job count。
   - 保留本地 debug log。
   - 平台侧保存 event history，便于排查失败任务。

## 测试计划

- 单测配置解析和路径展开。
- 单测 poll payload 生成。
- mock 平台 no-job 和 job-assigned 响应。
- mock Codex subprocess 执行。
- 增加集成测试：使用 `python -m codex_share_worker --configs ... --once`
  连接本地 Next.js dev server。
