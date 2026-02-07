# Claude API Structured Outputs 마이그레이션 가이드

> 이 문서는 Claude API에서 JSON 구조화 출력을 안정적으로 받기 위한 가이드입니다.
> 기존 Prefilling 방식의 한계와 Structured Outputs(tool_use) 패턴으로의 전환 방법을 설명합니다.

## 목차

1. [배경: Prefilling이란?](#1-배경-prefilling이란)
2. [Structured Outputs (tool_use 패턴)](#2-structured-outputs-tool_use-패턴)
3. [프로젝트 적용 예시](#3-프로젝트-적용-예시)
4. [Next.js 통합 패턴](#4-nextjs-통합-패턴)
5. [마이그레이션 체크리스트](#5-마이그레이션-체크리스트)
6. [주의사항 및 모범 사례](#6-주의사항-및-모범-사례)

---

## 1. 배경: Prefilling이란?

### 이전 방식

Prefilling은 `assistant` 메시지의 `content`에 JSON의 시작 부분(`{`, `[` 등)을 미리 채워서 모델이 JSON으로 응답하도록 유도하는 기법이었습니다.

```typescript
// ❌ 더 이상 권장하지 않는 방식 (Opus 4.6에서 400 에러 발생)
const response = await anthropic.messages.create({
  model: 'claude-opus-4-6',
  messages: [
    { role: 'user', content: '좌석 배치를 분석해주세요.' },
    { role: 'assistant', content: '{' },  // Prefilling
  ],
});
```

### 왜 문제가 되었나?

- **Claude Opus 4.6부터** assistant prefilling이 제한되어 `400 Bad Request` 에러가 발생합니다.
- Prefilling은 모델이 JSON을 출력하도록 "유도"할 뿐, JSON 유효성을 보장하지 않습니다.
- 스키마 검증이 없어 예상과 다른 필드가 포함되거나 누락될 수 있습니다.

---

## 2. Structured Outputs (tool_use 패턴)

### 핵심 개념

Claude API의 `tools` + `tool_choice`를 활용하면 **JSON Schema 기반의 구조화된 응답**을 보장받을 수 있습니다. 이는 실제로 도구를 호출하는 것이 아니라, 모델이 특정 스키마에 맞는 JSON을 출력하도록 강제하는 패턴입니다.

### 기본 사용법

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  // tool_choice로 특정 tool 강제 호출
  tool_choice: { type: 'tool', name: 'analyze_result' },
  tools: [
    {
      name: 'analyze_result',
      description: '분석 결과를 구조화된 형식으로 반환합니다.',
      input_schema: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: '분석 요약 (1-2문장)',
          },
          score: {
            type: 'number',
            description: '0~100 점수',
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: '개선 제안 목록',
          },
        },
        required: ['summary', 'score', 'suggestions'],
      },
    },
  ],
  messages: [
    { role: 'user', content: '이 데이터를 분석해주세요: ...' },
  ],
});

// tool_use 블록에서 구조화된 결과 추출
const toolUseBlock = response.content.find(
  (block) => block.type === 'tool_use'
);
if (toolUseBlock && toolUseBlock.type === 'tool_use') {
  const result = toolUseBlock.input as {
    summary: string;
    score: number;
    suggestions: string[];
  };
  console.log(result.summary);
  console.log(result.score);
}
```

### Prefill 대비 장점

| 비교 항목 | Prefilling | Structured Outputs |
|----------|-----------|-------------------|
| JSON 유효성 보장 | ❌ 유도만 가능 | ✅ 스키마 기반 보장 |
| 타입 안전성 | ❌ 없음 | ✅ JSON Schema 검증 |
| 필드 누락 방지 | ❌ 불가 | ✅ `required` 지정 가능 |
| Opus 4.6 호환 | ❌ 400 에러 | ✅ 정상 동작 |
| 중첩 객체 지원 | 불안정 | ✅ 안정적 |

---

## 3. 프로젝트 적용 예시

### 3-1. 좌석 배치 분석

AI가 기존 배치 결과를 분석하고 개선점을 제안하는 기능입니다.

```typescript
// src/app/api/ai/analyze-arrangement/route.ts

const tools = [
  {
    name: 'arrangement_analysis',
    description: '자리배치 분석 결과를 반환합니다.',
    input_schema: {
      type: 'object' as const,
      properties: {
        overallScore: {
          type: 'number',
          description: '전체 배치 품질 점수 (0~100)',
        },
        partBalance: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            details: { type: 'string' },
          },
          required: ['score', 'details'],
        },
        heightOrder: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            details: { type: 'string' },
          },
          required: ['score', 'details'],
        },
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              description: { type: 'string' },
              affectedMembers: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['priority', 'description'],
          },
        },
      },
      required: ['overallScore', 'partBalance', 'heightOrder', 'suggestions'],
    },
  },
];
```

### 3-2. 출석 데이터 자연어 쿼리

"이번 달 알토 파트 출석률은?" 같은 자연어 질문에 구조화된 응답을 반환합니다.

```typescript
// src/app/api/ai/attendance-query/route.ts

const tools = [
  {
    name: 'attendance_query_result',
    description: '출석 관련 질문에 대한 구조화된 응답',
    input_schema: {
      type: 'object' as const,
      properties: {
        answer: {
          type: 'string',
          description: '자연어 답변',
        },
        data: {
          type: 'object',
          properties: {
            metric: { type: 'string', description: '조회 지표 (출석률, 인원수 등)' },
            value: { type: 'number' },
            unit: { type: 'string', enum: ['percent', 'count', 'ratio'] },
            period: { type: 'string', description: '조회 기간' },
            partFilter: {
              type: 'string',
              enum: ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'ALL'],
              description: '파트 필터',
            },
          },
          required: ['metric', 'value', 'unit'],
        },
        relatedInsights: {
          type: 'array',
          items: { type: 'string' },
          description: '관련 인사이트 목록',
        },
      },
      required: ['answer', 'data'],
    },
  },
];
```

### 3-3. 대원 관리 액션 변환

자연어 명령을 구조화된 관리 액션으로 변환합니다.

```typescript
// src/app/api/ai/member-action/route.ts

const tools = [
  {
    name: 'member_management_action',
    description: '대원 관리 자연어 명령을 구조화된 액션으로 변환',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['update_part', 'update_status', 'add_note', 'query_info'],
          description: '수행할 액션 타입',
        },
        targetMember: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            part: { type: 'string', enum: ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] },
          },
          required: ['name'],
        },
        parameters: {
          type: 'object',
          description: '액션별 파라미터',
          properties: {
            newPart: { type: 'string', enum: ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'] },
            newStatus: { type: 'string', enum: ['REGULAR', 'SUBSTITUTE', 'INACTIVE', 'LEAVE'] },
            note: { type: 'string' },
          },
        },
        confidence: {
          type: 'number',
          description: '해석 신뢰도 (0~1). 0.7 미만이면 사용자 확인 필요',
        },
        confirmationMessage: {
          type: 'string',
          description: '사용자에게 보여줄 확인 메시지',
        },
      },
      required: ['action', 'targetMember', 'confidence', 'confirmationMessage'],
    },
  },
];
```

---

## 4. Next.js 통합 패턴

### API Route 패턴 (권장)

기존 `src/app/api/arrangements/[id]/recommend/route.ts`의 패턴과 일관되게 구현합니다.

```typescript
// src/app/api/ai/[feature]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// 1. 입력 검증 스키마 (Zod)
const requestSchema = z.object({
  query: z.string().min(1).max(500),
  context: z.record(z.unknown()).optional(),
});

// 2. Claude API 클라이언트 (싱글톤)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // 3. Auth 체크
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 4. 입력 검증
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    // 5. Claude API 호출 (Structured Outputs)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      tool_choice: { type: 'tool', name: 'your_tool_name' },
      tools: [/* tool 정의 */],
      messages: [
        { role: 'user', content: validation.data.query },
      ],
    });

    // 6. 결과 추출
    const toolUseBlock = response.content.find(
      (block) => block.type === 'tool_use'
    );
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'AI response format error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: toolUseBlock.input,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      isDev && error instanceof Error
        ? { error: 'Internal server error', message: error.message }
        : { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Supabase Edge Function 패턴 (선택적)

서버리스 환경에서 실행할 경우:

```typescript
// supabase/functions/ai-analyze/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  const { query, context } = await req.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      tool_choice: { type: 'tool', name: 'analyze_result' },
      tools: [/* tool 정의 */],
      messages: [{ role: 'user', content: query }],
    }),
  });

  const data = await response.json();
  const toolUse = data.content.find(
    (block: { type: string }) => block.type === 'tool_use'
  );

  return new Response(JSON.stringify({ result: toolUse?.input }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 5. 마이그레이션 체크리스트

### 환경 설정

- [ ] `@anthropic-ai/sdk` 패키지 설치: `npm install @anthropic-ai/sdk`
- [ ] `.env.local`에 `ANTHROPIC_API_KEY` 추가
- [ ] `.env.example`에 `ANTHROPIC_API_KEY=` 항목 추가

### API Route 생성

- [ ] `src/app/api/ai/` 디렉토리 생성
- [ ] 기능별 route.ts 파일 생성
- [ ] Zod 검증 스키마 정의
- [ ] Auth 체크 미들웨어 적용

### Tool 스키마 정의

- [ ] 각 기능별 `tools` 배열 정의
- [ ] `tool_choice`로 강제 호출 설정
- [ ] `required` 필드 명시
- [ ] 응답 타입을 TypeScript 인터페이스로 정의

### 프론트엔드 연동

- [ ] React Query 훅 생성 (`useMutation` 활용)
- [ ] 로딩 상태 및 에러 핸들링
- [ ] 응답 데이터 타입 공유 (shared types)

---

## 6. 주의사항 및 모범 사례

### 필수 사항

1. **`tool_choice` 반드시 지정**: `{ type: 'tool', name: '...' }`로 특정 tool을 강제해야 합니다. 지정하지 않으면 모델이 일반 텍스트로 응답할 수 있습니다.

2. **`required` 필드 명시**: 스키마에서 반드시 필요한 필드는 `required`에 포함해야 합니다. 누락하면 모델이 해당 필드를 생략할 수 있습니다.

3. **응답에서 `tool_use` 블록 확인**: `response.content`는 배열이며, `text` 블록과 `tool_use` 블록이 섞여 있을 수 있습니다. 항상 `type === 'tool_use'`로 필터링하세요.

### 모델 선택

| 용도 | 권장 모델 | 이유 |
|------|----------|------|
| 복잡한 분석/추론 | `claude-opus-4-6` | 최고 품질, 높은 비용 |
| 일반 구조화 응답 | `claude-sonnet-4-5-20250929` | 균형잡힌 성능/비용 |
| 단순 분류/변환 | `claude-haiku-4-5-20251001` | 빠른 응답, 낮은 비용 |

### 비용 최적화

- **단순한 작업에는 Haiku 사용**: 분류, 변환 같은 단순 작업은 Haiku로 충분합니다.
- **프롬프트 캐싱 활용**: 시스템 프롬프트가 동일한 경우 API 호출 비용을 절감할 수 있습니다.
- **`max_tokens` 적절히 설정**: 예상 출력 크기에 맞게 설정하여 불필요한 토큰 소비를 방지합니다.

### Streaming 처리

대용량 응답의 경우 Streaming을 사용할 수 있습니다:

```typescript
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  tool_choice: { type: 'tool', name: 'analyze_result' },
  tools: [/* ... */],
  messages: [/* ... */],
});

// input_json 이벤트로 부분 JSON을 수신
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
    // 부분 JSON 데이터 처리
    process.stdout.write(event.delta.partial_json);
  }
}

// 최종 완성된 메시지
const finalMessage = await stream.finalMessage();
```

### 에러 핸들링

```typescript
try {
  const response = await anthropic.messages.create({ /* ... */ });
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 400:
        // 잘못된 요청 (스키마 오류 등)
        break;
      case 401:
        // API 키 오류
        break;
      case 429:
        // Rate limit - 재시도 로직 필요
        break;
      case 529:
        // 서버 과부하 - 잠시 후 재시도
        break;
    }
  }
}
```

### 보안

- **API 키는 서버 전용**: `ANTHROPIC_API_KEY`는 절대 클라이언트에 노출하지 않습니다. (`NEXT_PUBLIC_` 접두사 사용 금지)
- **Rate Limiting**: API Route에 rate limiting을 적용하여 남용 방지
- **입력 검증**: 사용자 입력은 반드시 Zod 등으로 검증 후 Claude에 전달

---

## 참고 자료

- [Anthropic API 공식 문서 - Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [프로젝트 AI 추천 API](../src/app/api/arrangements/[id]/recommend/route.ts) - 기존 AI API Route 패턴 참고
- [프로젝트 ML 서비스 클라이언트](../src/lib/ml-service-client.ts) - 외부 AI 서비스 통신 패턴 참고
