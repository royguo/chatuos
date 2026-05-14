from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import asdict
from typing import Any

from .config import WorkerPlan


class PlatformClient:
    def __init__(self, endpoint: str, worker_key: str, timeout: int = 30) -> None:
        self.endpoint = endpoint.rstrip("/")
        self.worker_key = worker_key
        self.timeout = timeout

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"{self.endpoint}{path}",
            data=body,
            headers={
                "Authorization": f"Bearer {self.worker_key}",
                "Content-Type": "application/json",
                "User-Agent": "gpt-proxy-worker/0.1.0",
            },
            method="POST",
        )

        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            data = response.read().decode("utf-8")
            if not data:
                return {}
            value = json.loads(data)
            if not isinstance(value, dict):
                raise RuntimeError("Platform returned a non-object JSON response")
            return value

    def poll(self, plans: list[WorkerPlan]) -> dict[str, Any] | None:
        payload = {
            "plans": [asdict(plan) for plan in plans],
        }
        try:
            response = self._post("/api/worker/poll", payload)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Worker poll failed: HTTP {error.code}: {detail}") from error

        if response.get("type") == "job.assigned":
            return response

        return None

    def send_event(self, job_id: str, event: dict[str, Any]) -> None:
        self._post(
            "/api/worker/events",
            {
                "job_id": job_id,
                "event": event,
                "sent_at": int(time.time()),
            },
        )
