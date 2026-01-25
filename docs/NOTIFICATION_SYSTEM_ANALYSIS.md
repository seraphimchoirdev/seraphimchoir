# 새로핌ON 알림/피드백 시스템 분석 및 도입 제안

## 목차
1. [Toast vs Snackbar 개념 정리](#1-toast-vs-snackbar-개념-정리)
2. [디자인 가이드라인](#2-디자인-가이드라인)
3. [현재 프로젝트 분석](#3-현재-프로젝트-분석)
4. [알림 유형별 도입 제안](#4-알림-유형별-도입-제안)
5. [라이브러리 선택](#5-라이브러리-선택)
6. [구현 로드맵](#6-구현-로드맵)

---

## 1. Toast vs Snackbar 개념 정리

### 1.1 Toast
| 항목 | 설명 |
|------|------|
| **목적** | 순수 정보 전달 (단방향) |
| **액션 버튼** | 없음 |
| **지속 시간** | 2-4초 자동 사라짐 |
| **사용자 입력** | 불필요 |
| **사용 예시** | "저장되었습니다", "복사되었습니다" |

### 1.2 Snackbar
| 항목 | 설명 |
|------|------|
| **목적** | 작업 완료 피드백 + 후속 액션 제공 |
| **액션 버튼** | 1개 (실행취소, 재시도, 보기 등) |
| **지속 시간** | 4-10초 또는 사용자 dismiss |
| **사용자 입력** | 선택적 |
| **사용 예시** | "삭제되었습니다 [실행취소]", "오류 발생 [재시도]" |

### 1.3 Alert Dialog
| 항목 | 설명 |
|------|------|
| **목적** | 중요한 의사결정 요청 |
| **액션 버튼** | 2개 (확인/취소) |
| **지속 시간** | 사용자 응답까지 대기 |
| **사용자 입력** | 필수 |
| **사용 예시** | "정말 삭제하시겠습니까?", "변경사항을 저장하시겠습니까?" |

### 1.4 선택 가이드라인
```
┌─────────────────────────────────────────────────────────────┐
│  사용자 액션이 필요한가?                                      │
│                                                              │
│  NO ──────────► Toast (자동 사라짐)                          │
│                 "저장되었습니다"                              │
│                                                              │
│  YES ─────────► 선택적 액션인가?                             │
│                                                              │
│                 YES ──► Snackbar (액션 버튼 포함)            │
│                         "삭제되었습니다 [실행취소]"           │
│                                                              │
│                 NO ───► Alert Dialog (차단적 확인)           │
│                         "정말 삭제하시겠습니까?"              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 디자인 가이드라인

### 2.1 Material Design 권장사항
- 동시에 **하나의 Snackbar만** 표시
- 화면 **하단에서 위로** 애니메이션
- **핵심 기능의 유일한 접근 방법이 되면 안 됨**
- 아이콘 포함 불가 (텍스트만)

### 2.2 Apple HIG 권장사항
- 간결하고 정보적인 메시지
- 최대 4개 버튼 (실질적으로 2개 권장)
- 파괴적 액션은 오른쪽에 배치

### 2.3 모바일 웹 고려사항
- **하단 네비게이션과 겹침 방지** (bottom-20 이상)
- 전체 너비 사용 권장
- 터치 dismiss 지원
- `prefers-reduced-motion` 미디어 쿼리 지원

---

## 3. 현재 프로젝트 분석

### 3.1 기존 알림 패턴 현황

| 패턴 | 사용 횟수 | 문제점 |
|------|----------|--------|
| `alert()` | 22개 | 브라우저 기본 UI, 디자인 불일치 |
| `confirm()` | 8개 | 커스터마이징 제한, UX 미흡 |
| `AlertDialog` | 설치됨 | **미사용** |
| `Toast` | 없음 | **미설치** |

### 3.2 alert() 사용처 분류

#### 성공 메시지 (10개) → **Toast로 전환 권장**
| 파일 | 메시지 | 제안 |
|------|--------|------|
| `AttendanceList.tsx:347` | "저장되었습니다." | Toast (success) |
| `ArrangementHeader.tsx:137` | "이미지가 다운로드되었습니다." | Toast (success) |
| `ArrangementHeader.tsx:156` | "이미지가 클립보드에 복사되었습니다." | Toast (success) |
| `ArrangementHeader.tsx:234` | "저장되었습니다." | Toast (success) |
| `ArrangementHeader.tsx:323` | "자리배치표가 공유되었습니다." | Toast (success) |
| `ArrangementHeader.tsx:385` | "자리배치표가 확정되었습니다." | Toast (success) |
| `ArrangementHeader.tsx:419` | "작성중 상태로 되돌렸습니다." | Toast (info) |
| `arrangements/[id]/page.tsx:190` | "AI 추천이 적용되었습니다!" | Toast (success) |
| `arrangements/[id]/page.tsx:483` | "줄반장 N명이 자동 지정되었습니다." | Toast (success) |
| `AttendanceList.tsx:345` | "저장 완료! (일부 제외)" | Toast (warning) |

#### 에러 메시지 (12개) → **Toast (error) 또는 Snackbar로 전환**
| 파일 | 메시지 | 제안 |
|------|--------|------|
| `AttendanceInputModal.tsx:182` | "출석 기록 저장에 실패했습니다." | Toast (error) |
| `AttendanceList.tsx:352` | "저장 실패: ${errorMessage}" | Snackbar [재시도] |
| `DeadlineStatusBar.tsx:90` | 마감 해제 실패 | Toast (error) |
| `ArrangementHeader.tsx:142` | "이미지 다운로드에 실패했습니다." | Snackbar [재시도] |
| `ArrangementHeader.tsx:162` | 클립보드 복사 실패 | Toast (error) |
| `ArrangementHeader.tsx:239` | "저장에 실패했습니다." | Snackbar [재시도] |
| `ArrangementHeader.tsx:329` | "공유에 실패했습니다." | Snackbar [재시도] |
| `ArrangementHeader.tsx:391` | "확정에 실패했습니다." | Snackbar [재시도] |
| `ArrangementList.tsx:233` | "배치표 삭제에 실패했습니다." | Toast (error) |
| `RecommendButton.tsx:46` | "AI 추천 중 오류가 발생했습니다." | Snackbar [재시도] |
| `Navigation.tsx:49` | "로그아웃 중 오류가 발생했습니다." | Snackbar [재시도] |
| `admin/member-links/page.tsx:73` | 입력 검증 실패 | Toast (warning) |

#### 정보/검증 메시지 (4개) → **Toast (info/warning)**
| 파일 | 메시지 | 제안 |
|------|--------|------|
| `AttendanceImporter.tsx:112` | "CSV 파일만 업로드 가능합니다" | Toast (warning) |
| `AttendanceImporter.tsx:125` | "유효하지 않은 데이터가 있습니다." | Toast (error) |
| `AttendanceList.tsx:305` | "저장할 변경사항이 없습니다." | Toast (info) |
| `ArrangementHeader.tsx:255` | "초기화할 내용이 없습니다." | Toast (info) |

### 3.3 confirm() 사용처 분류 → **AlertDialog로 전환**

#### 삭제 확인 (2개)
| 파일 | 메시지 | 제안 |
|------|--------|------|
| `management/documents/page.tsx:114` | "문서를 삭제하시겠습니까?" | AlertDialog (destructive) |
| `ConductorNotes.tsx:114` | "메모를 삭제하시겠습니까?" | AlertDialog (destructive) |

#### 작업 확인 (6개)
| 파일 | 메시지 | 제안 |
|------|--------|------|
| `arrangements/[id]/page.tsx:496` | "줄반장 지정을 해제하시겠습니까?" | AlertDialog |
| `AttendanceList.tsx:359` | "변경사항을 모두 취소하시겠습니까?" | AlertDialog |
| `ArrangementHeader.tsx:259` | "단계 초기화하시겠습니까?" | AlertDialog |
| `ArrangementHeader.tsx:267` | "전체 초기화하시겠습니까?" | AlertDialog (destructive) |
| `ArrangementHeader.tsx:276` | "배치표를 공유하시겠습니까?" | AlertDialog |
| `ArrangementHeader.tsx:340` | "배치표를 확정하시겠습니까?" | AlertDialog (warning) |
| `ArrangementHeader.tsx:402` | "작성중으로 되돌리시겠습니까?" | AlertDialog |
| `admin/member-links/page.tsx:88` | "연결 요청을 거부하시겠습니까?" | AlertDialog (destructive) |

### 3.4 기존 UI 컴포넌트 현황

```
src/components/ui/
├── alert.tsx           ✅ 설치됨 (배너형, 정적 표시용)
├── alert-dialog.tsx    ✅ 설치됨 (미사용!)
├── dialog.tsx          ✅ 설치됨 (사용 중)
├── spinner.tsx         ✅ 설치됨 (로딩 표시)
├── skeleton.tsx        ✅ 설치됨 (로딩 플레이스홀더)
└── toast.tsx           ❌ 없음 (설치 필요)
```

---

## 4. 알림 유형별 도입 제안

### 4.1 Toast 도입 대상 (22개)
자동으로 사라지는 비차단적 피드백

| 유형 | 개수 | variant | 예시 |
|------|------|---------|------|
| 성공 | 10개 | `success` | 저장, 다운로드, 복사 완료 |
| 에러 (단순) | 6개 | `error` | 복사 실패, 검증 실패 |
| 경고 | 3개 | `warning` | 일부 저장 제외, 파일 형식 오류 |
| 정보 | 3개 | `info` | 상태 변경 안내 |

### 4.2 Snackbar 도입 대상 (6개)
재시도 또는 실행취소 액션이 필요한 피드백

| 상황 | 액션 | 예시 |
|------|------|------|
| 저장 실패 | [재시도] | "저장 실패 [재시도]" |
| 다운로드 실패 | [재시도] | "다운로드 실패 [재시도]" |
| 네트워크 오류 | [재시도] | "네트워크 오류 [재시도]" |
| 삭제 완료 | [실행취소] | "삭제되었습니다 [실행취소]" (선택적) |

### 4.3 AlertDialog 도입 대상 (8개)
사용자 확인이 필수인 중요 작업

| 유형 | 개수 | 스타일 |
|------|------|--------|
| 삭제 확인 | 3개 | `destructive` (빨간 버튼) |
| 중요 변경 확인 | 3개 | `warning` (주황 강조) |
| 일반 확인 | 2개 | `default` |

---

## 5. 라이브러리 선택

### 5.1 Toast 라이브러리 비교

| 라이브러리 | 크기 | 특징 | shadcn/ui 호환 |
|-----------|------|------|---------------|
| **Sonner** | ~8KB | Hook 불필요, Promise API | ✅ 공식 지원 |
| React Hot Toast | ~5KB | 가벼움, 검증됨 | ⚠️ 별도 스타일링 |
| shadcn/ui Toast | ~3KB | useToast Hook 필요 | ✅ 기본 포함 |

### 5.2 권장: Sonner
- shadcn/ui 공식 지원 (향후 방향)
- Hook 없이 어디서든 `toast.success()` 호출 가능
- Promise API로 비동기 작업 피드백 간편
- 커스터마이징 용이

```bash
npx shadcn@latest add sonner
```

### 5.3 AlertDialog
- 이미 설치됨 (`@radix-ui/react-alert-dialog`)
- 현재 미사용 → 활용 필요

---

## 6. 구현 로드맵

### Phase 1: 기반 구축 ✅ 완료
1. ✅ Sonner 설치 및 Provider 설정
2. ✅ Toast 유틸리티 함수 생성 (`lib/toast.ts`)
3. ✅ 디자인 시스템 색상과 통합

### Phase 2: alert() → Toast 마이그레이션 ✅ 완료
1. ✅ 성공 메시지 10개 전환
2. ✅ 단순 에러 메시지 6개 전환
3. ✅ 정보/경고 메시지 6개 전환
4. ✅ React Query mutation 콜백에 Toast 추가 (추가 작업)

### Phase 3: confirm() → AlertDialog 마이그레이션 ✅ 완료
1. ✅ 삭제 확인 다이얼로그 3개 전환
2. ✅ 작업 확인 다이얼로그 5개 전환
3. ✅ ConfirmDialog 재사용 컴포넌트 생성 (variant: default/destructive/warning)

### Phase 4: Snackbar 패턴 추가 ✅ 완료
1. ✅ 재시도 가능한 에러에 액션 버튼 추가
   - ArrangementHeader: 이미지 다운로드, 저장, 공유, 확정, 롤백 실패
   - RecommendButton: AI 추천 실패
   - Navigation: 로그아웃 실패
   - AttendanceList: 출석 저장 실패
2. ✅ 실행취소 패턴 구현 (`showWithUndo` 함수)

### Phase 5: 품질 개선 ✅ 완료
1. ✅ 접근성 개선
   - Sonner 기본 aria-live 지원 활용
   - 포커스 표시 개선 (focus-visible 스타일)
   - 고대비 모드 지원 (@media prefers-contrast)
   - ConfirmDialog에 aria-busy 상태 추가
2. ✅ 모바일 UX 개선
   - 최소 터치 영역 확보 (48px, 버튼 44px)
   - 닫기 버튼 추가 (closeButton)
   - 스와이프로 닫기 지원
   - 하단 네비게이션과 겹침 방지 (offset: 80px)
   - 반응형 너비 (모바일: calc(100vw - 32px))
3. ✅ 애니메이션 최적화
   - prefers-reduced-motion 지원
   - duration 타입별 차등 적용 (성공 4초, 경고 5초, 에러 6초, 액션 8초)
   - visibleToasts 제한 (최대 3개)
   - expand={false}: 여러 알림 시 compact 표시

---

## 부록: 파일별 변경 목록

### Toast 전환 대상 파일
- `src/components/features/attendances/AttendanceList.tsx` (4개)
- `src/components/features/attendances/AttendanceInputModal.tsx` (1개)
- `src/components/features/attendances/AttendanceImporter.tsx` (3개)
- `src/components/features/attendances/DeadlineStatusBar.tsx` (1개)
- `src/components/features/arrangements/ArrangementHeader.tsx` (9개)
- `src/components/features/arrangements/ArrangementList.tsx` (1개)
- `src/components/features/arrangements/RecommendButton.tsx` (1개)
- `src/app/arrangements/[id]/page.tsx` (2개)
- `src/components/layout/Navigation.tsx` (1개)

### AlertDialog 전환 대상 파일
- `src/components/features/attendances/AttendanceList.tsx` (1개)
- `src/components/features/arrangements/ArrangementHeader.tsx` (5개)
- `src/components/features/members/ConductorNotes.tsx` (1개)
- `src/app/arrangements/[id]/page.tsx` (1개)
- `src/app/management/documents/page.tsx` (1개)
- `src/app/admin/member-links/page.tsx` (1개)

---

## 부록 B: 코드 예시

### Sonner 설치 후 기본 사용법

```typescript
// lib/toast.ts
import { toast } from 'sonner';

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string, onRetry?: () => void) => {
  if (onRetry) {
    toast.error(message, {
      action: {
        label: '재시도',
        onClick: onRetry,
      },
    });
  } else {
    toast.error(message);
  }
};

export const showWarning = (message: string) => {
  toast.warning(message);
};

export const showInfo = (message: string) => {
  toast.info(message);
};

// Promise 기반 사용 (비동기 작업)
export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, messages);
};
```

### AlertDialog 재사용 컴포넌트

```typescript
// components/ui/confirm-dialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                : ''
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 마이그레이션 예시: alert() → Toast

**Before:**
```typescript
// ArrangementHeader.tsx
const handleSave = async () => {
  try {
    await saveArrangement();
    alert('저장되었습니다.');
  } catch (error) {
    alert('저장에 실패했습니다.');
  }
};
```

**After:**
```typescript
// ArrangementHeader.tsx
import { showSuccess, showError } from '@/lib/toast';

const handleSave = async () => {
  try {
    await saveArrangement();
    showSuccess('저장되었습니다.');
  } catch (error) {
    showError('저장에 실패했습니다.', handleSave); // 재시도 버튼 포함
  }
};
```

### 마이그레이션 예시: confirm() → AlertDialog

**Before:**
```typescript
// ArrangementHeader.tsx
const handleReset = () => {
  if (confirm('전체 초기화하시겠습니까? 모든 배치가 삭제됩니다.')) {
    resetArrangement();
  }
};
```

**After:**
```typescript
// ArrangementHeader.tsx
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const [showResetDialog, setShowResetDialog] = useState(false);

// JSX
<>
  <Button onClick={() => setShowResetDialog(true)}>전체 초기화</Button>

  <ConfirmDialog
    open={showResetDialog}
    onOpenChange={setShowResetDialog}
    title="전체 초기화"
    description="모든 배치가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
    confirmLabel="초기화"
    variant="destructive"
    onConfirm={() => {
      resetArrangement();
      setShowResetDialog(false);
    }}
  />
</>
```

---

## 부록 C: 접근성 고려사항

### ARIA 속성
- Toast: `role="status"`, `aria-live="polite"`
- Error Toast: `role="alert"`, `aria-live="assertive"`
- AlertDialog: `role="alertdialog"`, `aria-modal="true"`

### 키보드 네비게이션
- Toast dismiss: `Escape` 키
- AlertDialog: `Tab`으로 버튼 간 이동, `Enter`로 확인, `Escape`로 취소

### 스크린리더 지원
- Sonner는 기본적으로 스크린리더 지원
- AlertDialog는 Radix UI 기반으로 ARIA 완벽 지원

---

*문서 작성일: 2025-01-25*
*작성자: Claude Code*
