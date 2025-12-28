# MemberList UI 리팩토링 완료

## 개요
MemberList 페이지를 UXUI_DESIGN_SYSTEM.md 및 Member_List_Design_refac.json의 디자인 시스템에 맞춰 전체적으로 리팩토링했습니다.

## 주요 변경사항

### 1. 색상 시스템 업데이트

#### Primary 색상 변경
- **이전**: indigo (indigo-600, indigo-50 등)
- **이후**: blue (blue-500, blue-50 등)
- 모든 버튼, 링크, 포커스 상태를 blue-500 (Primary)로 통일

#### 파트별 색상 (UXUI_DESIGN_SYSTEM.md 준수)
```typescript
SOPRANO: bg-pink-50 / text-pink-600 / border-pink-400
ALTO: bg-purple-50 / text-purple-600 / border-purple-400
TENOR: bg-teal-50 / text-teal-600 / border-teal-400
BASS: bg-blue-50 / text-blue-600 / border-blue-500
SPECIAL: bg-amber-50 / text-amber-600 / border-amber-500
```

#### 상태별 색상 (시맨틱 컬러)
```typescript
REGULAR: bg-green-100 / text-green-800 / border-green-300
NEW: bg-blue-100 / text-blue-800 / border-blue-300
ON_LEAVE: bg-gray-100 / text-gray-800 / border-gray-300
RESIGNED: bg-red-100 / text-red-800 / border-red-300
```

### 2. 신규 컴포넌트 생성

#### A. MemberAvatar.tsx
**위치**: `/src/components/features/members/MemberAvatar.tsx`

**기능**:
- 찬양대원의 이니셜을 표시하는 아바타 컴포넌트
- 파트별 배경색 자동 적용 (pink-400, purple-400, teal-400, blue-500, amber-500)
- 크기 옵션: sm (32px), md (40px), lg (48px)

**사용 예시**:
```tsx
<MemberAvatar name="김철수" part="SOPRANO" size="md" />
```

#### B. MemberTable.tsx
**위치**: `/src/components/features/members/MemberTable.tsx`

**기능**:
- 데스크톱용 테이블 뷰 (lg 이상에서 표시)
- 7개 컬럼: 대원(아바타+이름), 파트, 역할, 상태, 경력, 키, 액션
- 호버 시 액션 버튼 표시 (opacity 전환 효과)
- 액션: 상세보기(Eye), 수정(Edit2), 삭제(Trash2) 아이콘 사용
- 삭제 확인 모달 포함

**레이아웃**:
```
┌─────────────┬──────┬──────┬──────┬──────┬─────┬────────┐
│ 대원        │ 파트 │ 역할 │ 상태 │ 경력 │ 키  │ 액션   │
├─────────────┼──────┼──────┼──────┼──────┼─────┼────────┤
│ [아바타] 이름│ 배지 │ 배지 │ 배지 │ N년  │ Ncm │ 버튼들 │
└─────────────┴──────┴──────┴──────┴──────┴─────┴────────┘
```

### 3. 기존 컴포넌트 수정

#### A. MemberList.tsx
**변경사항**:
1. **반응형 레이아웃 추가**
   - `lg:block` - 데스크톱에서 테이블 뷰 표시
   - `lg:hidden` - 모바일/태블릿에서 카드 뷰 표시

2. **검색 UI 개선**
   - 검색 아이콘 추가 (왼쪽)
   - 지우기 버튼 추가 (오른쪽 X 아이콘)
   - 로딩 스피너 위치 조정

3. **적용된 필터 표시 (칩 형태)**
   - 파트, 상태, 검색어를 칩으로 표시
   - 각 칩에 제거 버튼 (X) 추가
   - "모두 지우기" 링크 추가

4. **색상 통일**
   - 모든 active 상태: blue-500
   - 모든 포커스 상태: focus:ring-blue-500
   - 로딩 스피너: blue-500

#### B. MemberCard.tsx
**변경사항**:
1. 파트 색상을 UXUI_DESIGN_SYSTEM.md 기준으로 변경
2. 상태 배지에 border 추가
3. 상세보기 버튼 색상: indigo → blue
4. 모든 border-radius를 rounded-md로 통일

#### C. page.tsx (members/page.tsx)
**변경사항**:
1. "찬양대원 등록" 버튼: bg-indigo-600 → bg-blue-500
2. 로딩 스피너: border-indigo-600 → border-blue-500

### 4. 접근성 개선

1. **ARIA 레이블 추가**
   ```tsx
   <button aria-label="검색어 지우기">
   <button aria-label="파트 필터 제거">
   <button aria-label="상세보기" title="상세보기">
   ```

2. **시맨틱 HTML**
   - `<table>` 구조에 `<thead>`, `<tbody>` 사용
   - `scope="col"` 속성으로 헤더 명시
   - `role` 속성 필요 시 추가 가능

3. **키보드 네비게이션**
   - 모든 버튼 및 링크 포커스 상태 명확히 표시
   - focus-visible 사용

### 5. 반응형 브레이크포인트

- **모바일** (< 768px): 카드 1열
- **태블릿** (768px ~ 1024px): 카드 2열
- **데스크톱** (≥ 1024px): 테이블 뷰

```tsx
<div className="hidden lg:block">
  <MemberTable /> {/* 데스크톱 전용 */}
</div>

<div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* 모바일/태블릿 전용 */}
  <MemberCard />
</div>
```

## 파일 변경 목록

### 신규 파일
- ✅ `/src/components/features/members/MemberAvatar.tsx`
- ✅ `/src/components/features/members/MemberTable.tsx`

### 수정 파일
- ✅ `/src/components/features/members/MemberList.tsx`
- ✅ `/src/components/features/members/MemberCard.tsx`
- ✅ `/src/app/members/page.tsx`

## 빌드 결과

```bash
npm run build
✓ Compiled successfully in 8.2s
✓ Generating static pages using 7 workers (19/19) in 531.4ms
```

**상태**: ✅ 빌드 성공

## 테스트 체크리스트

### 기능 테스트
- [ ] 데스크톱에서 테이블 뷰 표시 확인
- [ ] 모바일/태블릿에서 카드 뷰 표시 확인
- [ ] lg 브레이크포인트에서 테이블 ↔ 카드 전환 확인
- [ ] 검색 기능 동작 확인
- [ ] 필터 칩 제거 기능 확인
- [ ] 정렬 기능 동작 확인
- [ ] 페이지네이션 동작 확인
- [ ] 삭제 모달 동작 확인 (테이블, 카드 모두)

### UI/UX 테스트
- [ ] 파트별 색상 정확히 표시되는지 확인
- [ ] 상태별 색상 정확히 표시되는지 확인
- [ ] 호버 효과 확인 (테이블 행, 버튼)
- [ ] 액션 버튼 opacity 전환 확인
- [ ] 포커스 상태 확인 (blue-500 ring)
- [ ] 로딩 스피너 색상 확인

### 접근성 테스트
- [ ] 키보드만으로 네비게이션 가능한지 확인
- [ ] 스크린 리더로 테스트 (NVDA/VoiceOver)
- [ ] 색상 대비 확인 (WCAG AA 준수)
- [ ] 포커스 인디케이터 명확히 보이는지 확인

## 향후 개선 사항

1. **정렬 가능한 테이블 헤더**
   - 컬럼 헤더 클릭 시 정렬 (sortable)
   - 정렬 방향 화살표 표시

2. **다중 선택 기능**
   - 체크박스 추가
   - 일괄 삭제, 일괄 상태 변경 등

3. **컬럼 표시/숨김 설정**
   - 사용자가 원하는 컬럼만 표시

4. **테이블 가로 스크롤**
   - 작은 화면에서 테이블 표시 시 가로 스크롤

5. **Skeleton 로딩**
   - 스피너 대신 skeleton UI 사용

## 참고 문서

- UXUI_DESIGN_SYSTEM.md (색상 시스템)
- Member_List_Design_refac.json (레이아웃 원칙)
- Tailwind CSS v4 (유틸리티 클래스)
- Lucide React (아이콘 라이브러리)
