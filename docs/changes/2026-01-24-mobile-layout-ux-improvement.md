# 모바일/태블릿 WorkflowPanel 레이아웃 UX 개선

**날짜**: 2026-01-24
**변경 파일**: `src/app/arrangements/[id]/page.tsx`
**Phase**: Phase 1 (즉시 적용)

---

## 변경 요약

### 1. Breakpoint 변경: `lg:` → `md:` (1024px → 768px)

**Before:**
```tsx
// Line 545: 데스크톱 컨테이너
<div className="hidden lg:flex flex-1 overflow-hidden gap-4 p-4">

// Line 606: 모바일 컨테이너
<div className="flex lg:hidden flex-col flex-1 overflow-hidden relative">
```

**After:**
```tsx
// Line 545: 데스크톱/태블릿 컨테이너 (768px 이상)
<div className="hidden md:flex flex-1 overflow-hidden gap-4 p-4">

// Line 606: 모바일 컨테이너 (768px 미만)
<div className="flex md:hidden flex-col flex-1 overflow-hidden relative">
```

### 2. Bottom Sheet 높이 축소: 90% → 60% (max 500px)

**Before:**
```tsx
style={{
    height: '90%',
    animation: 'slideUp 0.3s ease-out',
}}
```

**After:**
```tsx
style={{
    height: '60%',
    maxHeight: '500px',
    animation: 'slideUp 0.3s ease-out',
}}
```

---

## 개선 효과

### 디바이스별 변화

| 디바이스 | 뷰포트 | Before | After | 개선 |
|---------|--------|--------|-------|------|
| 태블릿 세로 | 768×1024 | 모바일 (90% Bottom Sheet) | 데스크톱 (사이드바) | **대폭 개선** |
| 태블릿 가로 | 1024×768 | 데스크톱 | 데스크톱 | 유지 |
| 갤럭시 Z폴드 접힘 | 412×892 | 90% Bottom Sheet | 60% Bottom Sheet | **개선** |
| 일반 모바일 | 390×844 | 90% Bottom Sheet | 60% Bottom Sheet | **개선** |
| 갤럭시 Z폴드 펼침 | 1088×906 | 데스크톱 | 데스크톱 | 유지 |

### 핵심 개선점

1. **태블릿 세로 모드 (768px+)**: Bottom Sheet 대신 좌측 사이드바 레이아웃 적용
   - WorkflowPanel과 SeatsGrid를 동시에 확인 가능
   - Step 4에서 MemberSidebar도 함께 표시

2. **모바일 (768px 미만)**: Bottom Sheet 높이 40% 축소
   - SeatsGrid 40% 이상 가시성 확보
   - 배치 상태를 확인하면서 설정 변경 가능

---

## 레이아웃 구조

### Desktop/Tablet (≥768px)
```
┌─────────────────────────────────────────────────────────────┐
│ ArrangementHeader                                           │
├──────────┬──────────┬───────────────────────────────────────┤
│Workflow  │ Member   │                                       │
│Panel     │ Sidebar  │          SeatsGrid                    │
│(320px)   │ (Step 4) │          (flex-1)                     │
└──────────┴──────────┴───────────────────────────────────────┘
```

### Mobile (<768px)
```
┌─────────────────────────────────────────────────────────────┐
│ ArrangementHeader                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SeatsGrid (40% 이상 가시 영역)                               │
│  [⚙️ Floating Button]                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  MemberSidebar (Step 4, h-320px)                            │
├─────────────────────────────────────────────────────────────┤
│  Bottom Sheet (60%, max 500px)                              │
│  └── WorkflowPanel                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 검증 방법

1. `npm run dev` 실행
2. Chrome DevTools에서 다음 해상도 테스트:
   - **768×1024** (태블릿 세로): 데스크톱 레이아웃 확인
   - **412×892** (Z폴드 접힘): Bottom Sheet 60% 높이 확인
   - **390×844** (일반 모바일): Bottom Sheet 60% 높이 확인
3. Step 4에서 MemberSidebar와 WorkflowPanel 동시 접근 가능 여부 확인
4. SeatsGrid 가시성 40% 이상 확보 확인

---

## 향후 개선 계획 (Phase 2-3)

### Phase 2: 중간 Breakpoint 최적화 (선택적)
768px-1023px 범위에서:
- WorkflowPanel 너비: 320px → 280px 축소
- SeatsGrid 공간 확보

### Phase 3: 모바일 탭 통합 (선택적)
768px 미만에서:
- WorkflowPanel + MemberSidebar 탭 통합
- Bottom Sheet 높이 50% 고정
- 탭 전환으로 두 패널 접근

---

## 관련 이슈

- 기존 문제: Bottom Sheet가 SeatsGrid를 90% 가림
- 기존 문제: Step 4에서 MemberSidebar가 WorkflowPanel에 완전히 가려짐
- 기존 문제: 태블릿에서 불필요하게 모바일 레이아웃 적용
