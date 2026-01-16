```markdown
# 새로핌찬양대 출석·대원 관리 웹 애플리케이션 디자인 시스템

**Theme:** New Blossom Grace  
**Version:** 1.0.0  
**Last Updated:** 2025-11-20

---

## 목차

1. [디자인 철학](#디자인-철학)
2. [색상 시스템](#색상-시스템)
3. [타이포그래피](#타이포그래피)
4. [간격 및 레이아웃](#간격-및-레이아웃)
5. [컴포넌트 라이브러리](#컴포넌트-라이브러리)
6. [아이콘 및 일러스트레이션](#아이콘-및-일러스트레이션)
7. [상태 및 피드백](#상태-및-피드백)
8. [접근성 가이드라인](#접근성-가이드라인)
9. [반응형 디자인](#반응형-디자인)
10. [사용 예제](#사용-예제)

---

## 디자인 철학

### 핵심 가치

**새로핌찬양대**의 정체성을 반영하는 디자인 시스템:

- **새로움(Renewal)**: 날마다 새롭게 피어나는 생명과 은혜
- **경건함(Reverence)**: 천상의 찬양을 드리는 거룩한 공동체
- **평안(Peace)**: 밝고 부드러운 색채로 시각적 안정감 제공
- **공동체(Community)**: 따뜻하고 친근한 인터페이스로 대원 간 유대감 강화

### 디자인 원칙

1. **명확성(Clarity)**: 출석·대원·자리배치 정보를 직관적으로 전달
2. **일관성(Consistency)**: 모든 페이지에서 동일한 시각 언어 사용
3. **접근성(Accessibility)**: 모든 대원이 쉽게 사용할 수 있는 인터페이스
4. **효율성(Efficiency)**: 최소한의 클릭으로 필요한 작업 완료

---

## 색상 시스템

### 기본 색상 팔레트

#### Primary Colors
```

:root {
/_ Primary - Heavenly Blue _/
--color-primary-50: #F0F7FC;
--color-primary-100: #E1EFF9;
--color-primary-200: #C3DFF3;
--color-primary-300: #9CCBEA;
--color-primary-400: #6DA8E0; /_ Main _/
--color-primary-500: #4A8FD3;
--color-primary-600: #3671B8;
--color-primary-700: #2C5A95;
--color-primary-800: #224573;
--color-primary-900: #1A3556;
}

```

**사용 맥락:**
- Primary 400: 주요 액션 버튼, 링크, 활성 상태
- Primary 100-200: 호버 배경, 선택된 항목 배경
- Primary 600-700: 버튼 호버/액티브 상태

#### Secondary Colors

```

:root {
/_ Seraphim White _/
--color-background-primary: #FFFFFF;
--color-background-secondary: #F8FAFB;
--color-background-tertiary: #F0F4F8;
--color-surface: #FEFEFE;
}

```

**사용 맥락:**
- Background Primary: 메인 배경
- Background Secondary: 카드, 모달 배경
- Background Tertiary: 테이블 헤더, 사이드바

#### Accent Colors

```

:root {
/_ Grace Blossom Pink _/
--color-accent-50: #FEF6F7;
--color-accent-100: #FDECEF;
--color-accent-200: #F9D4DA;
--color-accent-300: #F4B8C3;
--color-accent-400: #EBA7B2; /_ Main _/
--color-accent-500: #E38A99;
--color-accent-600: #D66A7E;
--color-accent-700: #C14D64;
--color-accent-800: #9D3E50;
--color-accent-900: #7A3040;
}

```

**사용 맥락:**
- 중요 알림, 특별 이벤트 배지
- 프로필 강조, 자리배치 포인트
- 하이라이트 요소

#### Semantic Colors

```

:root {
/_ Success - Hope Green _/
--color-success-50: #F2FAF5;
--color-success-100: #E5F5EB;
--color-success-200: #C8EAD4;
--color-success-300: #9CD6B0; /_ Main _/
--color-success-400: #6FC18B;
--color-success-500: #4AAC6F;
--color-success-600: #359054;
--color-success-700: #287444;

/_ Warning - Cheerful Yellow _/
--color-warning-50: #FFFCF0;
--color-warning-100: #FFF9E0;
--color-warning-200: #FFF4C2;
--color-warning-300: #FFEE93; /_ Main _/
--color-warning-400: #FFE566;
--color-warning-500: #FADB3F;
--color-warning-600: #E0C127;

/_ Error - Faithful Red _/
--color-error-50: #FEF5F4;
--color-error-100: #FDEBE9;
--color-error-200: #FAD3D0;
--color-error-300: #F5ACA6;
--color-error-400: #EF8680; /_ Main _/
--color-error-500: #E6635B;
--color-error-600: #D84439;
--color-error-700: #B8332A;
}

```

**사용 맥락:**
- Success: 출석 완료, 저장 성공, 긍정 상태
- Warning: 지각 알림, 주의사항, 임시 저장
- Error: 결석, 오류, 필수 입력 누락

#### Text Colors

```

:root {
--color-text-primary: #2A3440;
--color-text-secondary: #6B6F76;
--color-text-tertiary: #9CA3AF;
--color-text-disabled: #D1D5DB;
--color-text-inverse: #FFFFFF;
}

```

#### Border & Divider

```

:root {
--color-border-default: #E4E9F2;
--color-border-subtle: #F0F4F8;
--color-border-strong: #C9D1DC;
--color-divider: #E4E9F2;
}

```

### 그라데이션

```

:root {
/_ Blessed Sky Gradient _/
--gradient-blessed-sky: linear-gradient(90deg, #B8D8EE 0%, #F3C6E8 100%);
--gradient-blessed-sky-vertical: linear-gradient(180deg, #B8D8EE 0%, #F3C6E8 100%);

/_ Subtle variants _/
--gradient-primary-subtle: linear-gradient(135deg, #E1EFF9 0%, #F0F7FC 100%);
--gradient-accent-subtle: linear-gradient(135deg, #FEF6F7 0%, #FDECEF 100%);
}

```

**사용 맥락:**
- Blessed Sky: 페이지 헤더, 히어로 섹션, 중요 배너
- Subtle variants: 카드 배경, 호버 효과

### 색상 사용 가이드라인

#### 명도 대비 (Contrast Ratios)

- **일반 텍스트**: 최소 4.5:1 (WCAG AA)
- **큰 텍스트 (18px+ 또는 14px bold+)**: 최소 3:1
- **UI 컴포넌트**: 최소 3:1

#### 색상 조합 예시

**✅ 권장 조합:**
- Primary 400 버튼 + White 텍스트 (대비율 4.8:1)
- Text Primary + Background Primary (대비율 12.5:1)
- Success 300 배경 + Text Primary (대비율 7.2:1)

**❌ 피해야 할 조합:**
- Accent 400 배경 + White 텍스트 (대비율 부족)
- Warning 300 배경 + White 텍스트 (대비율 부족)

---

## 타이포그래피

### 폰트 패밀리

```

:root {
/_ 본문 및 UI _/
--font-family-base: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont,
'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;

/_ 제목 (선택적 강조) _/
--font-family-display: 'Pretendard Variable', 'Pretendard', sans-serif;

/_ 코드, 데이터 _/
--font-family-mono: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
}

```

**폰트 로딩:**

```

<link rel="stylesheet" as="style" crossorigin 
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
```

### 타이포그래피 스케일

```
:root {
  /* Font Sizes */
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;     /* 18px */
  --font-size-xl: 1.25rem;      /* 20px */
  --font-size-2xl: 1.5rem;      /* 24px */
  --font-size-3xl: 1.875rem;    /* 30px */
  --font-size-4xl: 2.25rem;     /* 36px */
  --font-size-5xl: 3rem;        /* 48px */

  /* Font Weights */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;

  /* Letter Spacing */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;
}
```

### 타이포그래피 클래스

```
/* Headings */
.heading-1 {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--color-text-primary);
}

.heading-2 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

.heading-3 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-text-primary);
}

.heading-4 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
  color: var(--color-text-primary);
}

/* Body Text */
.body-large {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);
}

.body-base {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

.body-small {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}

/* Labels & Captions */
.label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

.caption {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-text-tertiary);
}
```

### 사용 예시

```
<h1 class="heading-1">출석 현황</h1>
<h2 class="heading-2">2025년 11월</h2>
<p class="body-base">총 42명 중 38명 출석 (90.5%)</p>
<span class="caption">마지막 업데이트: 2025-11-20 오후 8시</span>
```

---

## 간격 및 레이아웃

### 간격 시스템 (Spacing Scale)

```
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### Border Radius

```
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;    /* 4px */
  --radius-base: 0.5rem;   /* 8px */
  --radius-md: 0.75rem;    /* 12px */
  --radius-lg: 1rem;       /* 16px */
  --radius-xl: 1.5rem;     /* 24px */
  --radius-full: 9999px;   /* Circle */
}
```

### 그림자 (Shadows)

```
:root {
  --shadow-xs: 0 1px 2px rgba(42, 52, 64, 0.05);
  --shadow-sm: 0 1px 3px rgba(42, 52, 64, 0.08),
               0 1px 2px rgba(42, 52, 64, 0.04);
  --shadow-base: 0 4px 6px rgba(42, 52, 64, 0.06),
                 0 2px 4px rgba(42, 52, 64, 0.03);
  --shadow-md: 0 8px 16px rgba(42, 52, 64, 0.08),
               0 4px 8px rgba(42, 52, 64, 0.04);
  --shadow-lg: 0 16px 32px rgba(42, 52, 64, 0.12),
               0 8px 16px rgba(42, 52, 64, 0.06);
  --shadow-xl: 0 24px 48px rgba(42, 52, 64, 0.16),
               0 12px 24px rgba(42, 52, 64, 0.08);
}
```

### 레이아웃 그리드

```
.container {
  width: 100%;
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}

@media (min-width: 640px) {
  .container {
    padding-left: var(--space-6);
    padding-right: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding-left: var(--space-8);
    padding-right: var(--space-8);
  }
}
```

### Z-index 레이어

```
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
}
```

---

## 컴포넌트 라이브러리

### 버튼 (Buttons)

#### Primary Button

```
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  color: var(--color-text-inverse);
  background-color: var(--color-primary-400);
  border: none;
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-primary:hover {
  background-color: var(--color-primary-500);
  box-shadow: var(--shadow-base);
  transform: translateY(-1px);
}

.btn-primary:active {
  background-color: var(--color-primary-600);
  box-shadow: var(--shadow-xs);
  transform: translateY(0);
}

.btn-primary:disabled {
  background-color: var(--color-text-disabled);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
```

#### Secondary Button

```
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  color: var(--color-primary-400);
  background-color: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-secondary:hover {
  background-color: var(--color-primary-100);
  border-color: var(--color-primary-300);
}

.btn-secondary:active {
  background-color: var(--color-primary-200);
}
```

#### Outline Button

```
.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  background-color: transparent;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-outline:hover {
  background-color: var(--color-background-tertiary);
  border-color: var(--color-border-strong);
}
```

#### 버튼 크기 변형

```
.btn-sm {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
}

.btn-lg {
  padding: var(--space-4) var(--space-8);
  font-size: var(--font-size-lg);
}

.btn-full {
  width: 100%;
}
```

### 카드 (Cards)

```
.card {
  background-color: var(--color-background-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all 0.2s ease-in-out;
}

.card:hover {
  box-shadow: var(--shadow-base);
  transform: translateY(-2px);
}

.card-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.card-body {
  padding: var(--space-6);
}

.card-footer {
  padding: var(--space-4) var(--space-6);
  background-color: var(--color-background-tertiary);
  border-top: 1px solid var(--color-border-subtle);
}
```

### 배지 (Badges)

```
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  border-radius: var(--radius-full);
}

.badge-success {
  color: var(--color-success-700);
  background-color: var(--color-success-100);
  border: 1px solid var(--color-success-200);
}

.badge-warning {
  color: var(--color-warning-700);
  background-color: var(--color-warning-100);
  border: 1px solid var(--color-warning-200);
}

.badge-error {
  color: var(--color-error-700);
  background-color: var(--color-error-100);
  border: 1px solid var(--color-error-200);
}

.badge-info {
  color: var(--color-primary-700);
  background-color: var(--color-primary-100);
  border: 1px solid var(--color-primary-200);
}

.badge-accent {
  color: var(--color-accent-700);
  background-color: var(--color-accent-100);
  border: 1px solid var(--color-accent-200);
}
```

### 테이블 (Tables)

```
.table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.table-header {
  background-color: var(--color-background-tertiary);
  border-bottom: 2px solid var(--color-border-default);
}

.table-header th {
  padding: var(--space-4) var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-align: left;
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.table-body tr {
  border-bottom: 1px solid var(--color-border-subtle);
  transition: background-color 0.15s ease;
}

.table-body tr:hover {
  background-color: var(--color-primary-50);
}

.table-body td {
  padding: var(--space-4) var(--space-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.table-body tr:last-child {
  border-bottom: none;
}
```

### 폼 요소 (Form Elements)

#### Input

```
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-base);
  font-family: var(--font-family-base);
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-base);
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input:disabled {
  background-color: var(--color-background-tertiary);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.input-error {
  border-color: var(--color-error-400);
}

.input-error:focus {
  box-shadow: 0 0 0 3px var(--color-error-100);
}
```

#### Select

```
.select {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-base);
  font-family: var(--font-family-base);
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236B6F76' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  padding-right: var(--space-8);
}

.select:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}
```

#### Checkbox & Radio

```
.checkbox,
.radio {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: var(--color-primary-400);
  cursor: pointer;
}

.checkbox:focus,
.radio:focus {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
}
```

#### Label

```
.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.form-label-required::after {
  content: '*';
  margin-left: var(--space-1);
  color: var(--color-error-400);
}
```

#### Helper Text

```
.form-helper {
  margin-top: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.form-error {
  margin-top: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-error-600);
}
```

### 모달 (Modals)

```
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(42, 52, 64, 0.6);
  backdrop-filter: blur(2px);
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal {
  position: relative;
  width: 100%;
  max-width: 500px;
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  z-index: var(--z-modal);
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  padding: var(--space-6) var(--space-6) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--space-6);
}

.modal-footer {
  padding: var(--space-4) var(--space-6) var(--space-6);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
```

### 알림 (Alerts)

```
.alert {
  display: flex;
  align-items: start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-base);
  border: 1px solid;
}

.alert-success {
  color: var(--color-success-700);
  background-color: var(--color-success-50);
  border-color: var(--color-success-200);
}

.alert-warning {
  color: var(--color-warning-700);
  background-color: var(--color-warning-50);
  border-color: var(--color-warning-200);
}

.alert-error {
  color: var(--color-error-700);
  background-color: var(--color-error-50);
  border-color: var(--color-error-200);
}

.alert-info {
  color: var(--color-primary-700);
  background-color: var(--color-primary-50);
  border-color: var(--color-primary-200);
}
```

---

## 아이콘 및 일러스트레이션

### 아이콘 시스템

**권장 아이콘 라이브러리:** [Lucide Icons](https://lucide.dev/) 또는 [Heroicons](https://heroicons.com/)

```
.icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2;
  color: currentColor;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.icon-lg {
  width: 1.5rem;
  height: 1.5rem;
}

.icon-xl {
  width: 2rem;
  height: 2rem;
}
```

### 주요 아이콘 사용 예시

| 기능        | 아이콘        | 맥락           |
| ----------- | ------------- | -------------- |
| 출석 완료   | `CheckCircle` | Success 색상   |
| 결석        | `XCircle`     | Error 색상     |
| 지각        | `Clock`       | Warning 색상   |
| 대원 프로필 | `User`        | Primary 색상   |
| 자리배치    | `Layout`      | Accent 색상    |
| 설정        | `Settings`    | Text Secondary |
| 로그아웃    | `LogOut`      | Text Secondary |
| 검색        | `Search`      | Text Tertiary  |
| 필터        | `Filter`      | Primary        |
| 다운로드    | `Download`    | Primary        |
| 편집        | `Edit`        | Text Secondary |
| 삭제        | `Trash`       | Error          |

---

## 상태 및 피드백

### 출석 상태

```
/* 출석 */
.status-present {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-success-700);
  background-color: var(--color-success-100);
  border: 1px solid var(--color-success-200);
  border-radius: var(--radius-full);
}

/* 결석 */
.status-absent {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-error-700);
  background-color: var(--color-error-100);
  border: 1px solid var(--color-error-200);
  border-radius: var(--radius-full);
}

/* 지각 */
.status-late {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-warning-700);
  background-color: var(--color-warning-100);
  border: 1px solid var(--color-warning-200);
  border-radius: var(--radius-full);
}

/* 미확인 */
.status-pending {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  background-color: var(--color-background-tertiary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-full);
}
```

### 로딩 상태

```
.spinner {
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid var(--color-primary-100);
  border-top-color: var(--color-primary-400);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: inherit;
  z-index: var(--z-sticky);
}
```

### 토스트 알림

```
.toast {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  min-width: 300px;
  max-width: 500px;
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-tooltip);
  animation: toastSlideIn 0.3s ease-out;
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-success {
  border-left: 4px solid var(--color-success-400);
}

.toast-error {
  border-left: 4px solid var(--color-error-400);
}

.toast-warning {
  border-left: 4px solid var(--color-warning-400);
}

.toast-info {
  border-left: 4px solid var(--color-primary-400);
}
```

---

## 접근성 가이드라인

### 키보드 네비게이션

- **Tab**: 다음 포커스 가능한 요소로 이동
- **Shift + Tab**: 이전 포커스 가능한 요소로 이동
- **Enter/Space**: 버튼 및 링크 활성화
- **Esc**: 모달/드롭다운 닫기
- **Arrow Keys**: 목록/테이블 탐색

### 포커스 상태

```
*:focus-visible {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-primary-400);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-primary-100);
}
```

### ARIA 레이블 가이드

```
<!-- 출석 체크박스 -->
<input
  type="checkbox"
  id="attendance-kim"
  aria-label="김민수 출석 체크"
  aria-describedby="attendance-kim-status"
/>
<span id="attendance-kim-status" class="sr-only">현재 상태: 출석</span>

<!-- 검색 입력 -->
<label for="search-member" class="sr-only">대원 검색</label>
<input
  type="text"
  id="search-member"
  placeholder="이름으로 검색..."
  aria-label="대원 이름 검색"
/>

<!-- 모달 -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">출석 현황</h2>
  <p id="modal-description">11월 20일 출석 현황을 확인하세요.</p>
</div>
```

### 스크린 리더 전용 텍스트

```
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 색상 독립적 정보 전달

**❌ 잘못된 예:**

```
<span style="color: green;">출석</span>
<span style="color: red;">결석</span>
```

**✅ 올바른 예:**

```
<span class="status-present">
  <CheckCircle class="icon-sm" />
  출석
</span>
<span class="status-absent">
  <XCircle class="icon-sm" />
  결석
</span>
```

---

## 반응형 디자인

### 브레이크포인트

```
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

### 반응형 유틸리티

```
/* Mobile First Approach */

/* 모바일 (기본) */
.grid-cols-1 {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

/* 태블릿 */
@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 데스크톱 */
@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  .lg\:grid-cols-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### 테이블 반응형 처리

```
/* 모바일: 카드 형태로 전환 */
@media (max-width: 767px) {
  .table-responsive {
    display: block;
  }

  .table-responsive thead {
    display: none;
  }

  .table-responsive tbody,
  .table-responsive tr,
  .table-responsive td {
    display: block;
    width: 100%;
  }

  .table-responsive tr {
    margin-bottom: var(--space-4);
    padding: var(--space-4);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-base);
  }

  .table-responsive td {
    padding: var(--space-2) 0;
    border: none;
  }

  .table-responsive td::before {
    content: attr(data-label);
    display: block;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    margin-bottom: var(--space-1);
  }
}
```

---

## 사용 예제

### 출석 현황 페이지

```
<div class="container">
  <!-- 헤더 -->
  <header style="background: var(--gradient-blessed-sky); padding: var(--space-10) 0; margin-bottom: var(--space-8); border-radius: var(--radius-xl);">
    <div style="padding: 0 var(--space-6);">
      <h1 class="heading-1" style="color: var(--color-text-inverse); margin-bottom: var(--space-2);">
        출석 현황
      </h1>
      <p class="body-large" style="color: rgba(255, 255, 255, 0.9);">
        2025년 11월 20일 수요예배
      </p>
    </div>
  </header>

  <!-- 통계 카드 -->
  <div class="grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style="margin-bottom: var(--space-8);">
    <div class="card">
      <div class="card-body">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p class="caption" style="margin-bottom: var(--space-2);">총 대원</p>
            <p class="heading-2">42명</p>
          </div>
          <div style="width: 48px; height: 48px; background: var(--color-primary-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center;">
            <Users class="icon-lg" style="color: var(--color-primary-400);" />
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p class="caption" style="margin-bottom: var(--space-2);">출석</p>
            <p class="heading-2" style="color: var(--color-success-400);">38명</p>
          </div>
          <div style="width: 48px; height: 48px; background: var(--color-success-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center;">
            <CheckCircle class="icon-lg" style="color: var(--color-success-400);" />
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p class="caption" style="margin-bottom: var(--space-2);">결석</p>
            <p class="heading-2" style="color: var(--color-error-400);">4명</p>
          </div>
          <div style="width: 48px; height: 48px; background: var(--color-error-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center;">
            <XCircle class="icon-lg" style="color: var(--color-error-400);" />
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p class="caption" style="margin-bottom: var(--space-2);">출석률</p>
            <p class="heading-2" style="color: var(--color-primary-400);">90.5%</p>
          </div>
          <div style="width: 48px; height: 48px; background: var(--color-primary-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center;">
            <TrendingUp class="icon-lg" style="color: var(--color-primary-400);" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 출석 목록 테이블 -->
  <div class="card">
    <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
      <h3 class="heading-4">대원 출석 현황</h3>
      <div style="display: flex; gap: var(--space-3);">
        <button class="btn-outline btn-sm">
          <Filter class="icon-sm" />
          필터
        </button>
        <button class="btn-primary btn-sm">
          <Download class="icon-sm" />
          내보내기
        </button>
      </div>
    </div>
    <div class="card-body" style="padding: 0;">
      <table class="table table-responsive">
        <thead class="table-header">
          <tr>
            <th>이름</th>
            <th>파트</th>
            <th>출석 상태</th>
            <th>도착 시간</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody class="table-body">
          <tr>
            <td data-label="이름">
              <div style="display: flex; align-items: center; gap: var(--space-3);">
                <div style="width: 40px; height: 40px; background: var(--color-accent-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-semibold); color: var(--color-accent-600);">
                  김
                </div>
                <span class="body-base" style="font-weight: var(--font-weight-medium);">김민수</span>
              </div>
            </td>
            <td data-label="파트">
              <span class="badge-info">소프라노</span>
            </td>
            <td data-label="출석 상태">
              <span class="status-present">
                <CheckCircle class="icon-sm" />
                출석
              </span>
            </td>
            <td data-label="도착 시간">
              <span class="body-small">18:45</span>
            </td>
            <td data-label="비고">
              <span class="caption">-</span>
            </td>
          </tr>
          <tr>
            <td data-label="이름">
              <div style="display: flex; align-items: center; gap: var(--space-3);">
                <div style="width: 40px; height: 40px; background: var(--color-accent-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-semibold); color: var(--color-accent-600);">
                  이
                </div>
                <span class="body-base" style="font-weight: var(--font-weight-medium);">이서연</span>
              </div>
            </td>
            <td data-label="파트">
              <span class="badge-info">알토</span>
            </td>
            <td data-label="출석 상태">
              <span class="status-late">
                <Clock class="icon-sm" />
                지각
              </span>
            </td>
            <td data-label="도착 시간">
              <span class="body-small">19:05</span>
            </td>
            <td data-label="비고">
              <span class="caption" style="color: var(--color-warning-600);">교통 지연</span>
            </td>
          </tr>
          <tr>
            <td data-label="이름">
              <div style="display: flex; align-items: center; gap: var(--space-3);">
                <div style="width: 40px; height: 40px; background: var(--color-accent-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-semibold); color: var(--color-accent-600);">
                  박
                </div>
                <span class="body-base" style="font-weight: var(--font-weight-medium);">박준영</span>
              </div>
            </td>
            <td data-label="파트">
              <span class="badge-info">테너</span>
            </td>
            <td data-label="출석 상태">
              <span class="status-absent">
                <XCircle class="icon-sm" />
                결석
              </span>
            </td>
            <td data-label="도착 시간">
              <span class="caption">-</span>
            </td>
            <td data-label="비고">
              <span class="caption" style="color: var(--color-error-600);">사전 연락</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### 자리배치 페이지

```
<div class="container">
  <header style="margin-bottom: var(--space-8);">
    <h1 class="heading-1" style="margin-bottom: var(--space-2);">자리 배치</h1>
    <p class="body-base" style="color: var(--color-text-secondary);">
      찬양대 무대 배치도를 확인하고 수정할 수 있습니다.
    </p>
  </header>

  <!-- 자리배치 그리드 -->
  <div class="card" style="margin-bottom: var(--space-6);">
    <div class="card-header">
      <h3 class="heading-4">소프라노</h3>
    </div>
    <div class="card-body">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-4);">
        <!-- 대원 카드 -->
        <div style="padding: var(--space-4); background: var(--color-accent-50); border: 2px solid var(--color-accent-200); border-radius: var(--radius-base); text-align: center; cursor: pointer; transition: all 0.2s;">
          <div style="width: 64px; height: 64px; margin: 0 auto var(--space-3); background: var(--color-accent-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); color: var(--color-accent-600);">
            김
          </div>
          <p class="body-small" style="font-weight: var(--font-weight-medium); margin-bottom: var(--space-1);">
            김민수
          </p>
          <span class="caption" style="color: var(--color-text-tertiary);">1열 3번</span>
        </div>

        <div style="padding: var(--space-4); background: var(--color-accent-50); border: 2px solid var(--color-accent-200); border-radius: var(--radius-base); text-align: center; cursor: pointer;">
          <div style="width: 64px; height: 64px; margin: 0 auto var(--space-3); background: var(--color-accent-100); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); color: var(--color-accent-600);">
            최
          </div>
          <p class="body-small" style="font-weight: var(--font-weight-medium); margin-bottom: var(--space-1);">
            최은지
          </p>
          <span class="caption" style="color: var(--color-text-tertiary);">1열 4번</span>
        </div>

        <!-- 빈 자리 -->
        <div style="padding: var(--space-4); background: var(--color-background-tertiary); border: 2px dashed var(--color-border-default); border-radius: var(--radius-base); text-align: center; cursor: pointer;">
          <div style="width: 64px; height: 64px; margin: 0 auto var(--space-3); background: transparent; border: 2px dashed var(--color-border-strong); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center;">
            <Plus class="icon-lg" style="color: var(--color-text-tertiary);" />
          </div>
          <p class="caption" style="color: var(--color-text-tertiary);">
            빈 자리
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 구현 참고사항

### CSS 변수 사용

모든 스타일은 CSS 변수를 사용하여 테마 변경 시 일괄 적용 가능하도록 설계되었습니다.

```
/* 전역 CSS 변수 선언 */
:root {
  /* 모든 디자인 토큰을 여기에 정의 */
}

/* 다크 모드 (선택 사항) */
@media (prefers-color-scheme: dark) {
  :root {
    /* 다크 모드 색상 재정의 */
  }
}
```

### 컴포넌트 우선순위

1. **핵심 컴포넌트** (1순위 구현)

   - 버튼 (Primary, Secondary, Outline)
   - 카드
   - 테이블
   - 폼 요소 (Input, Select, Checkbox)
   - 배지
   - 상태 표시

2. **보조 컴포넌트** (2순위 구현)

   - 모달
   - 알림/토스트
   - 드롭다운
   - 탭
   - 페이지네이션

3. **고급 컴포넌트** (3순위 구현)
   - 자리배치 드래그앤드롭
   - 차트/그래프
   - 캘린더
   - 파일 업로드

---

## 버전 관리

### 변경 이력

**v1.0.0 (2025-11-20)**

- 초기 디자인 시스템 구축
- 색상, 타이포그래피, 간격 시스템 정의
- 핵심 컴포넌트 라이브러리 작성
- 접근성 가이드라인 수립

---

## 기여 가이드

디자인 시스템 개선 제안이나 새로운 컴포넌트 추가 시:

1. 기존 디자인 원칙과 일관성 유지
2. 접근성 기준 준수 (WCAG 2.1 AA)
3. 반응형 동작 고려
4. 충분한 문서화 포함

---

**© 2025 새문안교회 새로핌찬양대 출석·대원 관리 시스템**  
**Design System v1.0.0**

```

출처
```
