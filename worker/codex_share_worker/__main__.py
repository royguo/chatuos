from __future__ import annotations

import argparse
import time
from typing import Any

from .client import PlatformClient
from .codex_runner import CodexRunner
from .config import WorkerConfig, load_config


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GPT Proxy contributor worker")
    parser.add_argument("--plans", default="plans.json", help="Path to plans JSON")
    parser.add_argument("--endpoint", help="Override platform endpoint")
    parser.add_argument("--worker-key", help="Override worker API key")
    parser.add_argument("--poll-interval", type=float, default=5.0)
    parser.add_argument("--once", action="store_true", help="Poll once and exit")
    return parser.parse_args()


def find_plan(config: WorkerConfig, job: dict[str, Any]):
    requested = job.get("plan")
    if requested:
        for plan in config.plans:
            if plan.name == requested:
                return plan
    return config.plans[0]


def main() -> None:
    args = parse_args()
    config = load_config(args.plans, args.endpoint, args.worker_key)
    client = PlatformClient(config.endpoint, config.worker_key)

    print(f"worker connected to {config.endpoint}")
    print(f"loaded plans: {', '.join(plan.name for plan in config.plans)}")

    while True:
        try:
            job = client.poll(config.plans)
            if job:
                job_id = str(job.get("job_id"))
                plan = find_plan(config, job)
                runner = CodexRunner(plan)

                def emit(event: dict[str, Any]) -> None:
                    client.send_event(job_id, event)

                exit_code = runner.run(job, emit)
                client.send_event(job_id, {"kind": "job.completed", "exit_code": exit_code})
            elif args.once:
                print("no job")
                return
            else:
                time.sleep(args.poll_interval)
        except KeyboardInterrupt:
            print("worker stopped")
            return
        except Exception as error:
            print(f"worker error: {error}")
            if args.once:
                raise
            time.sleep(args.poll_interval)


if __name__ == "__main__":
    main()
