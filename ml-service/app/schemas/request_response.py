"""
Pydantic 스키마 정의
요청/응답 데이터 검증 및 직렬화
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any
from enum import Enum


class Part(str, Enum):
    """파트 enum"""
    SOPRANO = "SOPRANO"
    ALTO = "ALTO"
    TENOR = "TENOR"
    BASS = "BASS"


class MemberInput(BaseModel):
    """대원 입력 데이터"""
    id: str
    name: str
    part: Part
    height: Optional[int] = None
    experience: Optional[int] = None
    is_leader: bool = False


class GridLayout(BaseModel):
    """그리드 레이아웃"""
    rows: int = Field(ge=4, le=8, description="행 수 (4-8)")
    row_capacities: List[int] = Field(alias="rowCapacities", description="행별 인원 수")
    zigzag_pattern: Literal["none", "even", "odd"] = Field(
        default="even",
        alias="zigzagPattern",
        description="지그재그 패턴"
    )

    class Config:
        populate_by_name = True


class RecommendRequest(BaseModel):
    """추천 요청"""
    members: List[MemberInput] = Field(description="출석 대원 목록")
    grid_layout: Optional[GridLayout] = Field(default=None, alias="gridLayout")

    class Config:
        populate_by_name = True


class SeatRecommendation(BaseModel):
    """개별 좌석 추천 결과"""
    member_id: str = Field(alias="memberId")
    member_name: str = Field(alias="memberName")
    part: Part
    row: int = Field(ge=0, description="행 (0-based)")
    col: int = Field(ge=0, description="열 (0-based)")

    class Config:
        populate_by_name = True


class RecommendResponse(BaseModel):
    """추천 응답"""
    seats: List[SeatRecommendation]
    grid_layout: GridLayout = Field(alias="gridLayout")
    quality_score: float = Field(alias="qualityScore", ge=0, le=1)
    metrics: Dict[str, float]
    metadata: Dict[str, Any]
    unassigned_members: List[str] = Field(default=[], alias="unassignedMembers")
    source: str = "python-ml"

    class Config:
        populate_by_name = True


class TrainRequest(BaseModel):
    """학습 요청"""
    force: bool = Field(default=False, description="기존 모델 덮어쓰기")


class TrainResponse(BaseModel):
    """학습 응답"""
    success: bool
    message: str
    samples_used: int = Field(alias="samplesUsed")
    metrics: Optional[Dict[str, float]] = None

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    """헬스체크 응답"""
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    model_loaded: bool = Field(alias="modelLoaded")
    database_connected: bool = Field(alias="databaseConnected")

    class Config:
        populate_by_name = True
        protected_namespaces = ()  # model_ 접두사 경고 무시
