/**
 * ML Service Client
 * Python FastAPI ML 서비스와 통신하는 클라이언트
 */

import { ML_SERVICE_CONFIG } from './constants';

// 환경 변수
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_SERVICE_TIMEOUT = Number(process.env.ML_SERVICE_TIMEOUT) || ML_SERVICE_CONFIG.DEFAULT_TIMEOUT;
const ML_SERVICE_ENABLED = process.env.ML_SERVICE_ENABLED !== "false";

// Types
export interface MLMemberInput {
  id: string;
  name: string;
  part: "SOPRANO" | "ALTO" | "TENOR" | "BASS" | "SPECIAL";
  height: number | null;
  experience: number | null;
  is_leader: boolean;
}

export interface MLGridLayout {
  rows: number;
  rowCapacities: number[];      // Python: alias="rowCapacities"
  zigzagPattern: "even" | "odd" | "none";  // Python: alias="zigzagPattern"
}

export interface MLRecommendRequest {
  members: MLMemberInput[];
  grid_layout?: MLGridLayout;
}

export interface MLSeatRecommendation {
  memberId: string;      // Python: alias="memberId"
  memberName: string;    // Python: alias="memberName"
  part: string;
  row: number;
  col: number;
}

export interface MLRecommendResponse {
  seats: MLSeatRecommendation[];
  gridLayout: MLGridLayout;       // Python: alias="gridLayout"
  qualityScore: number;           // Python: alias="qualityScore"
  metrics: {
    placementRate: number;
    partBalance: number;
    heightOrder: number;
    leaderPosition: number;
  };
  metadata: {
    totalMembers: number;
    placedMembers: number;
    statsLoaded: number;
  };
  unassignedMembers: string[];    // Python: alias="unassignedMembers"
  source: "python-ml";
}

export interface MLHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  modelLoaded: boolean;      // Python ML 서비스가 camelCase로 반환
  databaseConnected: boolean;
}

export interface MLTrainResponse {
  success: boolean;
  message: string;
  samples_used: number;
  metrics: {
    row_accuracy: number;
    col_accuracy: number;
    samples_used: number;
  };
}

// Error class
export class MLServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "MLServiceError";
  }
}

/**
 * ML 서비스 사용 가능 여부 확인
 */
export function isMLServiceEnabled(): boolean {
  return ML_SERVICE_ENABLED;
}

/**
 * ML 서비스 헬스 체크
 */
export async function checkMLServiceHealth(): Promise<MLHealthResponse | null> {
  if (!ML_SERVICE_ENABLED) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ML_SERVICE_CONFIG.HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${ML_SERVICE_URL}/api/v1/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as MLHealthResponse;
  } catch {
    console.warn("[ML Client] Health check failed - service may be unavailable");
    return null;
  }
}

/**
 * ML 서비스가 준비되었는지 확인 (healthy + model loaded)
 */
export async function isMLServiceReady(): Promise<boolean> {
  const health = await checkMLServiceHealth();
  return health !== null && health.status === "healthy" && health.modelLoaded;
}

/**
 * ML 서비스에 추천 요청
 */
export async function requestMLRecommendation(
  request: MLRecommendRequest
): Promise<MLRecommendResponse> {
  if (!ML_SERVICE_ENABLED) {
    throw new MLServiceError("ML service is disabled");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ML_SERVICE_TIMEOUT);

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/v1/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MLServiceError(
        errorData.detail || `ML service returned ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as MLRecommendResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof MLServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new MLServiceError("ML service request timed out");
    }

    throw new MLServiceError(
      "Failed to connect to ML service",
      undefined,
      error
    );
  }
}

/**
 * ML 모델 학습 요청
 */
export async function requestMLTraining(
  force: boolean = false
): Promise<MLTrainResponse> {
  if (!ML_SERVICE_ENABLED) {
    throw new MLServiceError("ML service is disabled");
  }

  const controller = new AbortController();
  // 학습은 시간이 오래 걸릴 수 있으므로 타임아웃을 길게 설정
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/v1/train`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ force }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MLServiceError(
        errorData.detail || `Training failed with status ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as MLTrainResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof MLServiceError) {
      throw error;
    }

    throw new MLServiceError(
      "Failed to request model training",
      undefined,
      error
    );
  }
}

/**
 * ML 모델 상태 확인
 */
export async function getMLModelStatus(): Promise<{
  is_trained: boolean;
  model_path: string;
} | null> {
  if (!ML_SERVICE_ENABLED) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ML_SERVICE_URL}/api/v1/model/status`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}
