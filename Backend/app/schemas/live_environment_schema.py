from __future__ import annotations

from pydantic import BaseModel, Field


class FarmerRealAdvisoryRequest(BaseModel):
    city: str = Field(default="Ajmer", min_length=2, max_length=100)
    latitude: float = Field(default=26.4499, ge=-90, le=90)
    longitude: float = Field(default=74.6399, ge=-180, le=180)
    crop: str = Field(default="Bajra", min_length=2, max_length=100)
    growth_stage: str = Field(default="vegetative", min_length=2, max_length=100)
    language: str = Field(default="hinglish", min_length=2, max_length=50)


class PlantationRealRecommendationRequest(BaseModel):
    city: str = Field(default="Ajmer", min_length=2, max_length=100)
    latitude: float = Field(default=26.4499, ge=-90, le=90)
    longitude: float = Field(default=74.6399, ge=-180, le=180)
    area_hectares: float = Field(default=5.0, gt=0, le=100000)
