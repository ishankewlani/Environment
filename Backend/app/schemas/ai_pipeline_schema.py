# ai_pipeline_schema.py — Pydantic schemas for AI/Data Pipeline Status module
# Final module: exposes architecture, current prototype mode, and upgrade roadmap.

from pydantic import BaseModel
from typing import List


# ── GET /api/ai/status ────────────────────────────────────────────────────────

class AIStatusSchema(BaseModel):
    module: str
    status: str
    mode: str
    current_ai_type: str
    real_ml_ready: bool
    active_engines: List[str]
    last_updated: str


# ── GET /api/ai/model-explanation ─────────────────────────────────────────────

class ModelDetailSchema(BaseModel):
    name: str
    input_features: List[str]
    outputs: List[str]
    current_method: str
    future_upgrade: str


class ModelExplanationSchema(BaseModel):
    current_version: str
    summary: str
    models: List[ModelDetailSchema]


# ── GET /api/data/sources ─────────────────────────────────────────────────────

class DataSourcesSchema(BaseModel):
    current_data_mode: str
    current_sources: List[str]
    future_real_sources: List[str]
    data_files: List[str]


# ── GET /api/data/pipeline-status ─────────────────────────────────────────────

class PipelineStageSchema(BaseModel):
    stage: str
    current_status: str
    future_status: str


class PipelineStatusSchema(BaseModel):
    pipeline_status: str
    stages: List[PipelineStageSchema]


# ── GET /api/project/final-status ─────────────────────────────────────────────

class FinalStatusSchema(BaseModel):
    project: str
    status: str
    frontend_connected: bool
    backend_connected: bool
    modules_completed: List[str]
    prototype_limitations: List[str]
    ready_for_demo: bool
