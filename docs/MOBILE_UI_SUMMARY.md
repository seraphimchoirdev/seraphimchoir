# 모바일 반응형 UI 개선 요약

## 빠른 시작

### 설치
```bash
cd choir-seat-app
npm install
npm run dev
```

### 테스트
1. Chrome DevTools (F12 → Ctrl+Shift+M)
2. 모바일 디바이스 선택 (iPhone 14, iPad Pro 등)
3. `/arrangements/[id]` 페이지 접속
4. 터치로 드래그 앤 드롭 테스트

---

## 주요 개선사항 (3가지)

### 1. 터치 드래그 앤 드롭 지원
- **TouchBackend 도입**: 모바일에서 드래그 앤 드롭 가능
- **자동 감지**: 데스크톱은 마우스, 모바일은 터치
- **설정**: 200ms 지연으로 스크롤과 구분

### 2. 탭 기반 모바일 레이아웃
- **모바일/태블릿**: 3개 탭으로 전환 (좌석그리드 | 대원목록 | 설정)
- **데스크톱**: 기존 3패널 가로 배치 유지
- **브레이크포인트**: 1024px (lg) 기준

### 3. 터치 영역 최적화
- **최소 터치 영역**: 44px × 44px (Apple HIG)
- **입력 필드**: 16px 폰트 (모바일 확대 방지)
- **버튼**: 모바일 44px, 데스크톱 40px

---

## 브레이크포인트 전략

| 화면 | 크기 | 레이아웃 |
|------|------|---------|
| 📱 모바일 | < 640px | 탭 3개 (아이콘만) |
| 📱 태블릿 | 640px ~ 1024px | 탭 3개 (아이콘+텍스트) |
| 💻 데스크톱 | ≥ 1024px | 3패널 가로 배치 |

---

## 수정된 파일 (8개)

### 신규 파일
1. `/src/lib/utils/dndBackend.ts` - MultiBackend 설정

### 주요 수정
2. `/package.json` - TouchBackend 의존성 추가
3. `/src/app/arrangements/[id]/page.tsx` - 탭 레이아웃 구현
4. `/src/components/features/arrangements/ArrangementHeader.tsx` - 반응형 헤더
5. `/src/components/features/arrangements/GridSettingsPanel.tsx` - 터치 영역 확대
6. `/src/components/features/seats/MemberSidebar.tsx` - 검색 입력 최적화
7. `/src/components/features/seats/DraggableMember.tsx` - 터치 드래그 지원
8. `/src/components/features/seats/SeatsGrid.tsx` - 좌석 크기 조정
9. `/src/components/features/seats/SeatSlot.tsx` - 터치 최적화

---

## 반응형 클래스 예시

### 너비
```jsx
className="w-full lg:w-80"  // 모바일: 전체, 데스크톱: 320px
```

### 폰트 크기
```jsx
className="text-sm sm:text-base lg:text-lg"  // 점진적 확대
```

### 패딩
```jsx
className="p-3 sm:p-4 lg:p-6"  // 모바일: 12px, 데스크톱: 24px
```

### 버튼 높이
```jsx
className="h-11 sm:h-10"  // 모바일: 44px, 데스크톱: 40px
```

### 조건부 표시
```jsx
className="hidden lg:flex"  // 데스크톱에서만 표시
className="lg:hidden"  // 모바일에서만 표시
```

---

## 디자인 시스템 준수

모든 변경사항은 `/UXUI_DESIGN_SYSTEM.md`를 준수합니다:

- ✅ CSS 변수 사용 (`var(--color-*)`)
- ✅ Pretendard 폰트
- ✅ 디자인 토큰 간격 시스템
- ✅ WCAG 2.1 AA 접근성
- ✅ 정의된 브레이크포인트 (sm, md, lg)

---

## 다음 단계

### 필수
- [ ] `npm install` 실행
- [ ] 모바일 브라우저에서 테스트
- [ ] 터치 드래그 동작 확인

### 선택
- [ ] 다양한 디바이스 테스트 (iPhone, Android, iPad)
- [ ] 성능 프로파일링 (Chrome DevTools Performance)
- [ ] 스크린 리더 테스트 (VoiceOver, TalkBack)

---

**상세 문서**: `/docs/MOBILE_RESPONSIVE_IMPROVEMENTS.md` 참고
