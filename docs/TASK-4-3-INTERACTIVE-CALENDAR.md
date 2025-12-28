# Task #4 Subtask 3: 캘린더 인터랙티브 기능 구현

## 개요

출석 관리 캘린더에 인터랙티브 기능을 추가하여 사용자가 날짜를 클릭하여 출석을 입력하고, 시각적 피드백을 통해 출석률을 쉽게 파악할 수 있도록 개선했습니다.

## 구현된 기능

### 1. 날짜 클릭 이벤트
- 캘린더의 날짜를 클릭하면 출석 입력 모달이 열립니다
- 모달에서 모든 회원의 출석 상태를 한 번에 입력 가능
- 기존 출석 기록이 있는 경우 자동으로 불러와 수정 가능

### 2. 출석 입력 모달 (AttendanceInputModal)
- **위치**: `/src/components/features/attendances/AttendanceInputModal.tsx`
- **기능**:
  - 선택한 날짜의 모든 회원 표시 (파트별 그룹화)
  - 체크박스로 출석/불참 선택
  - 불참 사유 입력 필드
  - "전체 출석" / "전체 불참" 버튼으로 빠른 입력
  - 실시간 통계 표시 (출석/불참 인원, 출석률)
  - 기존 기록 자동 로드 및 수정 지원
  - 신규 기록 생성과 기존 기록 업데이트를 동시 처리

### 3. 캘린더 날짜 셀 (CalendarDayCell)
- **위치**: `/src/components/features/attendances/CalendarDayCell.tsx`
- **시각적 피드백**:
  - 출석률에 따른 배경색:
    - 90% 이상: 초록색 (`bg-green-50`)
    - 70-90%: 노란색 (`bg-yellow-50`)
    - 70% 미만: 빨간색 (`bg-red-50`)
  - 오늘 날짜: 링 테두리 강조 (`ring-2 ring-indigo-500`)
  - 일요일/토요일: 빨간색/파란색 텍스트
- **호버 효과**:
  - 마우스 오버 시 "+" 버튼 표시
  - 툴팁으로 출석 통계 요약 표시
  - 배경색 변화 (hover state)

### 4. 업데이트된 AttendanceCalendar
- **위치**: `/src/components/features/attendances/AttendanceCalendar.tsx`
- **개선사항**:
  - `useMemo`를 사용한 성능 최적화 (날짜별 통계 계산)
  - 모달 상태 관리 (`selectedDate`, `isModalOpen`)
  - `CalendarDayCell` 컴포넌트로 리팩토링
  - 업데이트된 범례 (출석률 표시)

## 주요 구현 내용

### 성능 최적화

```typescript
// 날짜별 출석 기록 메모이제이션
const attendancesByDate = useMemo(() => {
  const map = new Map<string, typeof attendances>();
  if (!attendances) return map;

  attendances.forEach((attendance) => {
    const existing = map.get(attendance.date) || [];
    map.set(attendance.date, [...existing, attendance]);
  });

  return map;
}, [attendances]);
```

### 신규 생성 및 업데이트 처리

모달에서 저장할 때:
1. 기존 기록이 없는 회원: 신규 생성 (`useBulkCreateAttendances`)
2. 기존 기록이 있고 변경된 회원: 업데이트 (`useBulkUpdateAttendances`)
3. 두 작업을 `Promise.all`로 병렬 실행

```typescript
if (attendancesToCreate.length > 0) {
  promises.push(bulkCreateMutation.mutateAsync(attendancesToCreate));
}

if (attendancesToUpdate.length > 0) {
  promises.push(bulkUpdateMutation.mutateAsync(attendancesToUpdate));
}

await Promise.all(promises);
```

### 파트별 그룹화

```typescript
const groupedByPart = useMemo(() => {
  const groups: Record<string, MemberAttendanceState[]> = {
    SOPRANO: [],
    ALTO: [],
    TENOR: [],
    BASS: [],
    SPECIAL: [],
  };

  attendanceStates.forEach((state) => {
    groups[state.part].push(state);
  });

  return groups;
}, [attendanceStates]);
```

## 사용자 경험 (UX)

### 캘린더 사용 흐름
1. 사용자가 월간 캘린더를 확인
2. 출석률이 낮은 날짜를 색상으로 쉽게 식별
3. 날짜를 클릭하여 상세 정보 확인 및 입력
4. 모달에서 파트별로 그룹화된 회원 목록 확인
5. 체크박스로 빠르게 출석/불참 선택
6. 불참 사유 필요 시 입력
7. "저장" 버튼 클릭 시 자동으로 신규 생성 및 업데이트 처리
8. 캘린더가 자동으로 새로고침되어 최신 데이터 표시

### 접근성 (Accessibility)
- 버튼에 `aria-label` 추가
- 키보드 네비게이션 지원 (Tab 키)
- 색상뿐만 아니라 텍스트로도 정보 제공
- 포커스 관리 (모달 열림/닫힘)

## 기술 스택

- **React 19**: 최신 React 기능 활용
- **React Query**: 서버 상태 관리 및 캐싱
- **date-fns**: 날짜 처리 및 포맷팅
- **Tailwind CSS**: 반응형 스타일링
- **TypeScript**: 타입 안전성

## 파일 구조

```
src/components/features/attendances/
├── AttendanceCalendar.tsx      # 메인 캘린더 컴포넌트 (업데이트)
├── AttendanceInputModal.tsx     # 출석 입력 모달 (신규)
└── CalendarDayCell.tsx          # 날짜 셀 컴포넌트 (신규)
```

## 테스트 방법

### 1. 빌드 확인
```bash
npm run build
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 브라우저에서 테스트
1. `/attendances` 페이지 접속
2. 캘린더에서 날짜 클릭
3. 모달에서 출석 입력
4. "저장" 클릭 후 캘린더 색상 변화 확인

### 4. 기능별 체크리스트
- [ ] 날짜 클릭 시 모달 열림
- [ ] 기존 출석 기록 자동 로드
- [ ] 전체 선택/해제 버튼 동작
- [ ] 개별 체크박스 토글
- [ ] 불참 사유 입력
- [ ] 저장 후 캘린더 새로고침
- [ ] 출석률에 따른 색상 변화
- [ ] 호버 시 툴팁 표시
- [ ] 오늘 날짜 강조 표시
- [ ] 모바일 반응형 확인

## 향후 개선 사항

### 1. 키보드 네비게이션
- 화살표 키로 날짜 이동
- Enter 키로 모달 열기
- Esc 키로 모달 닫기 (이미 구현됨)

### 2. 드래그 선택
- 여러 날짜를 드래그하여 일괄 입력

### 3. 필터링
- 파트별 필터링
- 출석률 필터링

### 4. 엑셀 내보내기
- 월별 출석 현황을 엑셀로 다운로드

### 5. 알림 기능
- 출석률이 낮은 날짜에 대한 알림
- 미입력 날짜 알림

## 버그 및 주의사항

### 알려진 제한사항
1. **권한 확인**: 출석 입력은 `PART_LEADER` 이상의 권한이 필요합니다
2. **중복 방지**: 동일한 날짜에 동일한 회원의 출석을 중복 생성하면 409 에러 발생 (모달에서는 자동으로 업데이트 처리)
3. **대량 데이터**: 회원이 100명 이상일 경우 모달 로딩 시간이 길어질 수 있음

### 에러 처리
- API 에러 시 alert로 사용자에게 알림
- 콘솔에 에러 로그 출력
- 저장 실패 시 모달이 닫히지 않아 재시도 가능

## 관련 파일

### 컴포넌트
- `/src/components/features/attendances/AttendanceCalendar.tsx`
- `/src/components/features/attendances/AttendanceInputModal.tsx`
- `/src/components/features/attendances/CalendarDayCell.tsx`

### 훅
- `/src/hooks/useAttendances.ts` (사용)
- `/src/hooks/useMembers.ts` (사용)

### API
- `/src/app/api/attendances/route.ts` (GET)
- `/src/app/api/attendances/batch/route.ts` (POST, PATCH)

### 타입
- `/src/types/database.types.ts`

## 참고 자료

- [date-fns 문서](https://date-fns.org/)
- [React Query 문서](https://tanstack.com/query/latest)
- [Tailwind CSS 문서](https://tailwindcss.com/)
- [WCAG 접근성 가이드](https://www.w3.org/WAI/WCAG21/quickref/)

## 작업 완료 일시

2025-11-20

## 작업자 메모

- React Compiler가 활성화되어 있어 별도의 `React.memo` 최적화가 필요 없음
- Supabase RLS가 활성화되어 있으므로 권한 관리 필수
- 모든 텍스트는 한국어로 작성 (프로젝트 요구사항)
