'use client';

import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Link2,
  LogIn,
  PlusSquare,
  QrCode,
  Share,
  Smartphone,
  Vote,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

type Platform = 'iphone' | 'android';

/**
 * 새로핌ON 시작 가이드 (전대원 오픈 온보딩)
 *
 * 50~60대 대원 기준으로 작성 — 큰 글씨, 한 화면에 한 단계, 쉬운 표현.
 * 로그인 없이 접근 가능 (가입 전 안내 페이지).
 */
export default function OnboardingPage() {
  const [platform, setPlatform] = useState<Platform>('iphone');

  // 접속 기기에 맞는 탭 자동 선택
  // (초기값 계산에 UA를 쓰면 서버/클라이언트 마크업이 갈려 hydration mismatch — effect로 처리)
  useEffect(() => {
    if (/Android/i.test(navigator.userAgent)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(userAgent)에 반응
      setPlatform('android');
    }
  }, []);

  const stepBadge = (n: number) => (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-500)] text-lg font-bold text-white">
      {n}
    </span>
  );

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)] pb-16">
      {/* 헤더 */}
      <div className="bg-[var(--color-background-primary)] px-5 pt-10 pb-8 text-center shadow-sm">
        <p className="text-sm font-medium text-[var(--color-primary-600)]">새문안교회 새로핌찬양대</p>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
          새로핌<span className="text-[var(--color-primary-500)]">:On</span> 시작 가이드
        </h1>
        <p className="mt-3 text-base text-[var(--color-text-secondary)]">
          아래 순서대로 하나씩 따라 하시면 됩니다.
          <br />
          막히면 옆의 도우미 대원에게 편하게 물어보세요!
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-5 pt-6">
        {/* 1. 접속 */}
        <section className="rounded-2xl bg-[var(--color-background-primary)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {stepBadge(1)}
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              <QrCode className="mr-1 inline h-5 w-5 text-[var(--color-primary-500)]" />
              앱에 접속하기
            </h2>
          </div>
          <div className="mt-3 space-y-2 pl-1 text-base leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              스마트폰 <strong className="text-[var(--color-text-primary)]">카메라</strong>로 안내지의{' '}
              <strong className="text-[var(--color-text-primary)]">QR 코드</strong>를 비추고, 화면에 뜨는
              노란 링크를 누르세요.
            </p>
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              ⚠️ 카카오톡으로 받은 링크로 열면 설치가 안 됩니다. 꼭{' '}
              <strong>카메라로 QR을 찍어서</strong> 열어주세요.
            </p>
          </div>
        </section>

        {/* 2. 로그인(가입) */}
        <section className="rounded-2xl bg-[var(--color-background-primary)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {stepBadge(2)}
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              <LogIn className="mr-1 inline h-5 w-5 text-[var(--color-primary-500)]" />
              카카오로 로그인하기
            </h2>
          </div>
          <div className="mt-3 space-y-2 pl-1 text-base leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              노란색 <strong className="text-[var(--color-text-primary)]">카카오 로그인</strong> 버튼을
              누르세요. 처음이어도 자동으로 가입됩니다.
            </p>
            <p className="text-sm">
              비밀번호를 따로 만들 필요가 없어서 가장 쉽습니다. 카카오톡을 쓰지 않는 분은 도우미와 함께
              이메일로 가입해주세요.
            </p>
          </div>
        </section>

        {/* 3. 대원 연결 */}
        <section className="rounded-2xl bg-[var(--color-background-primary)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {stepBadge(3)}
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              <Link2 className="mr-1 inline h-5 w-5 text-[var(--color-primary-500)]" />내 이름과 연결하기
            </h2>
          </div>
          <div className="mt-3 space-y-2 pl-1 text-base leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              로그인하면 나오는 안내에서{' '}
              <strong className="text-[var(--color-text-primary)]">찬양대 명단의 내 이름</strong>을 찾아
              선택하고 <strong className="text-[var(--color-text-primary)]">연결 신청</strong>을 누르세요.
            </p>
            <p>
              파트장님이 승인하면 완료됩니다. (현장에서 바로 승인해 드려요 — 잠시만 기다려주세요)
            </p>
          </div>
        </section>

        {/* 4. 홈 화면에 설치 — 플랫폼 분기 */}
        <section className="rounded-2xl bg-[var(--color-background-primary)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {stepBadge(4)}
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              <Smartphone className="mr-1 inline h-5 w-5 text-[var(--color-primary-500)]" />홈 화면에 앱
              설치하기
            </h2>
          </div>

          {/* 기종 선택 탭 */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPlatform('iphone')}
              aria-pressed={platform === 'iphone'}
              className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-base font-bold transition-colors ${
                platform === 'iphone'
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                  : 'border-[var(--color-border-default)] text-[var(--color-text-tertiary)]'
              }`}
            >
              📱 아이폰
            </button>
            <button
              type="button"
              onClick={() => setPlatform('android')}
              aria-pressed={platform === 'android'}
              className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-base font-bold transition-colors ${
                platform === 'android'
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                  : 'border-[var(--color-border-default)] text-[var(--color-text-tertiary)]'
              }`}
            >
              🤖 안드로이드 (갤럭시)
            </button>
          </div>

          <div className="mt-4 space-y-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
            {platform === 'iphone' ? (
              <>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[var(--color-text-primary)]">①</span>
                  <span>
                    화면 <strong className="text-[var(--color-text-primary)]">아래 가운데</strong>의{' '}
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-background-tertiary)] px-2 py-0.5">
                      <Share className="h-4 w-4" /> 공유
                    </span>{' '}
                    버튼을 누르세요
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[var(--color-text-primary)]">②</span>
                  <span>
                    아래로 내려서{' '}
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-background-tertiary)] px-2 py-0.5">
                      <PlusSquare className="h-4 w-4" /> 홈 화면에 추가
                    </span>
                    를 누르세요
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[var(--color-text-primary)]">③</span>
                  <span>
                    오른쪽 위 <strong className="text-[var(--color-text-primary)]">추가</strong>를 누르면
                    끝!
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[var(--color-text-primary)]">①</span>
                  <span>
                    화면에 <strong className="text-[var(--color-text-primary)]">&quot;앱 설치&quot;</strong>{' '}
                    안내가 뜨면 <strong className="text-[var(--color-text-primary)]">설치</strong>를
                    누르세요 — 설치하면 홈 화면 아이콘까지 자동으로 생겨요
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[var(--color-text-primary)]">②</span>
                  <span>
                    안내가 안 뜨면(Chrome): 오른쪽 위{' '}
                    <strong className="text-[var(--color-text-primary)]">⋮</strong> 메뉴 →{' '}
                    <strong className="text-[var(--color-text-primary)]">앱 설치</strong>(또는 홈 화면에
                    추가)를 누르세요
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-[var(--color-text-primary)]">③</span>
                  <span>
                    <strong className="text-[var(--color-text-primary)]">
                      인터넷(삼성 브라우저)으로 열렸다면
                    </strong>
                    : 화면 아래 오른쪽 <strong className="text-[var(--color-text-primary)]">≡ 메뉴</strong>{' '}
                    → <strong className="text-[var(--color-text-primary)]">홈 화면에 추가</strong>를
                    누르세요
                  </span>
                </p>
              </>
            )}
            <p className="rounded-lg bg-[var(--color-primary-50)] p-3 text-sm text-[var(--color-primary-700)]">
              ✅ 설치가 끝나면 휴대폰 홈 화면에 <strong>새로핌:On</strong> 아이콘이 생깁니다. 앞으로는 이
              아이콘으로 열어주세요.
            </p>
          </div>
        </section>

        {/* 5. 알림 허용 */}
        <section className="rounded-2xl bg-[var(--color-background-primary)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {stepBadge(5)}
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              <Bell className="mr-1 inline h-5 w-5 text-[var(--color-primary-500)]" />
              알림 켜기
            </h2>
          </div>
          <div className="mt-3 space-y-2 pl-1 text-base leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              <strong className="text-[var(--color-text-primary)]">홈 화면의 새로핌:On 아이콘</strong>으로
              앱을 연 다음,
            </p>
            <p>
              아래 <strong className="text-[var(--color-text-primary)]">더보기 → 마이페이지</strong>에서{' '}
              <strong className="text-[var(--color-text-primary)]">허용하기</strong> 버튼을 누르고, 뜨는
              창에서 <strong className="text-[var(--color-text-primary)]">허용</strong>을 누르세요.
            </p>
            <p className="text-sm">
              실수로 &quot;허용 안 함&quot;을 눌렀다면 같은 자리의 <strong>방법 보기</strong> 버튼이
              해결 방법을 알려드립니다.
            </p>
          </div>
        </section>

        {/* 6. 출석 투표 */}
        <section className="rounded-2xl bg-[var(--color-background-primary)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {stepBadge(6)}
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              <Vote className="mr-1 inline h-5 w-5 text-[var(--color-primary-500)]" />
              출석 투표 해보기
            </h2>
          </div>
          <div className="mt-3 space-y-2 pl-1 text-base leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              화면 아래 <strong className="text-[var(--color-text-primary)]">내 출석</strong>을 누르면 이번
              주일 <strong className="text-[var(--color-text-primary)]">예배 등단</strong>과{' '}
              <strong className="text-[var(--color-text-primary)]">예배 후 연습</strong> 참여 여부를 선택할
              수 있습니다.
            </p>
            <p>
              지금 바로 이번 주일 참여 여부를 눌러보세요 — 그게 곧 실제 투표입니다! 🎉
            </p>
          </div>
        </section>

        {/* 완료 + 시작 버튼 */}
        <section className="rounded-2xl bg-[var(--color-primary-50)] p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--color-primary-500)]" />
          <p className="mt-2 text-lg font-bold text-[var(--color-text-primary)]">
            여기까지 하셨다면 준비 완료!
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            매주 투표 시간이 되면 알림으로 알려드립니다.
          </p>
          <Link href="/login" className="mt-4 inline-block w-full">
            <Button size="lg" className="w-full gap-1 text-lg">
              시작하러 가기 <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
