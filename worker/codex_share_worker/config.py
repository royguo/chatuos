from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class WorkerPlan:
    name: str
    model: str
    codex_home: str
    workspace_root: str
    max_concurrency: int = 1


@dataclass(frozen=True)
class WorkerConfig:
    endpoint: str
    worker_key: str
    user_id: str | None
    plans: list[WorkerPlan]


def _read_string(data: dict[str, Any], key: str, default: str | None = None) -> str:
    value = data.get(key, default)
    if not isinstance(value, str) or not value:
        raise ValueError(f"Missing or invalid string field: {key}")
    return value


def _read_optional_string(data: dict[str, Any], key: str) -> str | None:
    value = data.get(key)
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"Invalid string field: {key}")
    return value


def _expand_path(value: str) -> str:
    return str(Path(value).expanduser())


def load_config(path: str, endpoint: str | None, worker_key: str | None) -> WorkerConfig:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("Plan file must contain a JSON object")

    plans_raw = raw.get("plans")
    if not isinstance(plans_raw, list) or not plans_raw:
        raise ValueError("Plan file must contain at least one plan")

    plans: list[WorkerPlan] = []
    for item in plans_raw:
        if not isinstance(item, dict):
            raise ValueError("Each plan must be a JSON object")
        plans.append(
            WorkerPlan(
                name=_read_string(item, "name"),
                model=_read_string(item, "model", "gpt-5.3-codex"),
                codex_home=_expand_path(_read_string(item, "codex_home")),
                workspace_root=_expand_path(_read_string(item, "workspace_root")),
                max_concurrency=int(item.get("max_concurrency", 1)),
            )
        )

    resolved_endpoint = endpoint or _read_string(raw, "endpoint")
    resolved_key = worker_key or _read_string(raw, "worker_key")

    return WorkerConfig(
        endpoint=resolved_endpoint.rstrip("/"),
        worker_key=resolved_key,
        user_id=_read_optional_string(raw, "user_id"),
        plans=plans,
    )
