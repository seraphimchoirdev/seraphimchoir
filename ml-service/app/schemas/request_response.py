"""
Pydantic 스키마 정의
요청/응답 데이터 검증 및 직렬화

보안 참고:
- 모든 입력에 대해 길이/범위 제한 적용
- 문자열 입력에 대해 최대 길이 제한
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Literal, Any
from enum import Enum
import re


class Part(str, Enum):
    """파트 enum"""
    SOPRANO = "SOPRANO"
    ALTO = "ALTO"
    TENOR = "TENOR"
    BASS = "BASS"


class MemberInput(BaseModel):
    """대원 입력 데이터"""
    id: str = Field(min_length=1, max_length=100, description="대원 ID")
    name: str = Field(min_length=1, max_length=50, description="대원 이름")
    part: Part
    height: Optional[int] = Field(default=None, ge=100, le=250, description="키 (cm)")
    experience: Optional[int] = Field(default=None, ge=0, le=50, description="경력 (년)")
    is_leader: bool = False

    @field_validator('id', 'name')
    @classmethod
    def validate_no_script_injection(cls, v: str) -> str:
        """스크립트 인젝션 방지"""
        # HTML/Script 태그 제거
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML 태그는 허용되지 않습니다')
        return v.strip()


class GridLayout(BaseModel):
    """그리드 레이아웃"""
    rows: int = Field(ge=1, le=10, description="행 수 (1-10)")
    row_capacities: List[int] = Field(
        alias="rowCapacities",
        description="행별 인원 수",
        min_length=1,
        max_length=10
    )
    zigzag_pattern: Literal["none", "even", "odd"] = Field(
        default="even",
        alias="zigzagPattern",
        description="지그재그 패턴"
    )

    @field_validator('row_capacities')
    @classmethod
    def validate_row_capacities(cls, v: List[int]) -> List[int]:
        """행별 인원 수 검증"""
        for capacity in v:
            if not 1 <= capacity <= 20:
                raise ValueError('각 행의 인원은 1-20명이어야 합니다')
        return v

    class Config:
        populate_by_name = True


class RecommendRequest(BaseModel):
    """추천 요청"""
    members: List[MemberInput] = Field(
        description="출석 대원 목록",
        min_length=1,
        max_length=200  # 최대 200명 제한
    )
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
