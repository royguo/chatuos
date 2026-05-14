from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Callable

from .config import WorkerPlan

EventCallback = Callable[[dict[str, Any]], None]


class CodexRunner:
    def __init__(self, plan: WorkerPlan) -> None:
        self.plan = plan

    def run(self, job: dict[str, Any], on_event: EventCallback) -> int:
        job_id = str(job.get("job_id", f"local_{int(time.time())}"))
        prompt = str(job.get("prompt", ""))
        if not prompt:
            raise ValueError("Job is missing prompt")

        workspace = self._create_workspace(job_id)
        env = os.environ.copy()
        env["CODEX_HOME"] = self.plan.codex_home

        command = [
            "codex",
            "exec",
            "--json",
            "--ephemeral",
            "--cd",
            str(workspace),
            "--sandbox",
            "workspace-write",
            "--ask-for-approval",
            "never",
            "--model",
            self.plan.model,
            prompt,
        ]

        on_event(
            {
                "kind": "runner.started",
                "plan": self.plan.name,
                "workspace": str(workspace),
                "model": self.plan.model,
            }
        )

        process = subprocess.Popen(
            command,
            cwd=str(workspace),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        assert process.stdout is not None
        for line in process.stdout:
            stripped = line.strip()
            if not stripped:
                continue
            try:
                event = json.loads(stripped)
            except json.JSONDecodeError:
                event = {"kind": "stdout", "text": stripped}
            on_event({"kind": "codex.event", "payload": event})

        stderr = ""
        if process.stderr is not None:
            stderr = process.stderr.read()

        exit_code = process.wait()
        if stderr:
            on_event({"kind": "runner.stderr", "text": stderr[-8000:]})

        on_event({"kind": "runner.completed", "exit_code": exit_code})
        return exit_code

    def _create_workspace(self, job_id: str) -> Path:
        root = Path(self.plan.workspace_root).expanduser()
        root.mkdir(parents=True, exist_ok=True)
        workspace = root / job_id
        if workspace.exists():
            shutil.rmtree(workspace)
        workspace.mkdir(parents=True)
        return workspace
