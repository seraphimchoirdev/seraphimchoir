'use client';

import {
  AlertTriangle,
  Bell,
  BellOff,
  Calendar,
  Check,
  Download,
  Info,
  Loader2,
  Music,
  PlusSquare,
  Save,
  Share,
  Smartphone,
  Users,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import Link from 'next/link';

import AppShell from '@/components/layout/AppShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/useMyProfile';
import { usePWA } from '@/hooks/usePWA';

import { showError, showSuccess, showWarning } from '@/lib/toast';

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

const PART_BADGE_COLORS: Record<string, string> = {
  SOPRANO:
    'bg-[var(--color-part-soprano-50)] text-[var(--color-part-soprano-600)] border-[var(--color-part-soprano-500)]',
  ALTO: 'bg-[var(--color-part-alto-50)] text-[var(--color-part-alto-600)] border-[var(--color-part-alto-500)]',
  TENOR:
    'bg-[var(--color-part-tenor-50)] text-[var(--color-part-tenor-600)] border-[var(--color-part-tenor-500)]',
  BASS: 'bg-[var(--color-part-bass-50)] text-[var(--color-part-bass-600)] border-[var(--color-part-bass-500)]',
  SPECIAL:
    'bg-[var(--color-part-special-50)] text-[var(--color-part-special-600)] border-[var(--color-part-special-500)]',
};

const PART_AVATAR_COLORS: Record<string, string> = {
  SOPRANO: 'bg-[var(--color-part-soprano-500)]',
  ALTO: 'bg-[var(--color-part-alto-500)]',
  TENOR: 'bg-[var(--color-part-tenor-500)]',
  BASS: 'bg-[var(--color-part-bass-500)]',
  SPECIAL: 'bg-[var(--color-part-special-500)]',
};

/** "2월 23일 (일)" 형태로 날짜 포맷 */
function formatFriendlyDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  return `${month}월 ${day}일 (${dayName})`;
}

export default function MyPage() {
  const router = useRouter();
  const { isAuthenticated, isMemberLinked, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const updateMutation = useUpdateMyProfile();

  // PWA 훅
  const {
    isInstalled,
    canInstall,
    installApp,
    isIOS,
    pushPermission,
    canRequestPush,
    requestPushPermission,
    supportsPushInPWA,
  } = usePWA();

  // 폼 상태
  const [heightCm, setHeightCm] = useState<string>('');
  const [regularMemberSince, setRegularMemberSince] = useState<string>('');
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // 프로필 데이터로 폼 초기화 - 외부 데이터(서버에서 fetch한 profile)로 로컬 폼 상태 동기화
  useEffect(() => {
    if (profile?.member) {
      setHeightCm(profile.member.height_cm?.toString() || '');
      setRegularMemberSince(profile.member.regular_member_since || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const height = parseInt(heightCm, 10);
    if (heightCm && (isNaN(height) || height < 100 || height > 250)) {
      showWarning('키는 100cm ~ 250cm 사이의 숫자로 입력해주세요.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        height_cm: heightCm ? height : undefined,
        regular_member_since: regularMemberSince || null,
      });
      showSuccess('정보가 수정되었습니다.');
    } catch (err) {
      showError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
    }
  };

  // 로딩 중
  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // 인증 안됨
  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  // 대원 연결 안됨
  if (!isMemberLinked()) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
          <div className="container mx-auto max-w-2xl px-4 py-8">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                먼저 대원 연결이 필요합니다.{' '}
                <Link href="/member-link" className="underline">
                  대원 연결 페이지로 이동
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppShell>
    );
  }

  const member = profile?.member;

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          {/* ── 프로필 헤더 ── */}
          <div className="mb-6 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-background-secondary)] p-6">
            <div className="flex items-center gap-4">
              {/* 아바타 */}
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white ${
                  member?.part ? PART_AVATAR_COLORS[member.part] || 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary)]'
                }`}
              >
                {member?.name?.[0] || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                  {member?.name || profile?.name || '사용자'}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  {member?.part && (
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${PART_BADGE_COLORS[member.part] || ''}`}
                    >
                      {PART_LABELS[member.part] || member.part}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                  {profile?.email}
                </p>
              </div>
            </div>
          </div>

          {/* ── 내 정보 (읽기전용 + 편집 통합) ── */}
          <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-background-secondary)] shadow-[var(--shadow-sm)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              내 정보
            </h2>

            {/* 읽기 전용 필드 */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">이름</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {member?.name || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">파트</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {member?.part ? PART_LABELS[member.part] || member.part : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">이메일</span>
                <span className="text-[var(--color-text-primary)]">{profile?.email || '-'}</span>
              </div>
            </div>

            {/* 구분선 */}
            <div className="my-5 border-t border-[var(--color-border)]" />

            {/* 편집 가능 필드 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>키 (cm)</Label>
                <Input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="예: 170"
                  min={100}
                  max={250}
                />
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>AI 자리배치 추천에 활용됩니다.</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>정대원 임명일</Label>
                <Input
                  type="date"
                  value={regularMemberSince}
                  onChange={(e) => setRegularMemberSince(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    저장
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* ── 출석 현황 ── */}
          <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-background-secondary)] shadow-[var(--shadow-sm)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <Calendar className="h-5 w-5" />
              출석 현황
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* 최근 등단일 */}
              <div className="rounded-lg bg-[var(--color-background-tertiary)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                    <Music className="h-4 w-4 text-[var(--color-primary)]" />
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">최근 등단일</span>
                </div>
                {member?.last_service_date ? (
                  <p className="text-lg font-medium text-[var(--color-text-primary)]">
                    {formatFriendlyDate(member.last_service_date)}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    아직 등단 기록이 없습니다
                  </p>
                )}
              </div>
              {/* 최근 연습 출석일 */}
              <div className="rounded-lg bg-[var(--color-background-tertiary)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                    <Users className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">최근 연습 출석일</span>
                </div>
                {member?.last_practice_date ? (
                  <p className="text-lg font-medium text-[var(--color-text-primary)]">
                    {formatFriendlyDate(member.last_practice_date)}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    아직 연습 기록이 없습니다
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 앱 설정 ── */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-background-secondary)] shadow-[var(--shadow-sm)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <Smartphone className="h-5 w-5" />앱 설정
            </h2>
            <div className="space-y-3">
              {/* 앱 설치 상태 — 이미 설치된 경우 숨김 */}
              {!isInstalled && (
                <div className="flex items-center justify-between rounded-lg bg-[var(--color-background-tertiary)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                      <Download className="h-5 w-5 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">앱 설치하기</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        홈 화면에 추가하여 앱처럼 사용하세요
                      </p>
                    </div>
                  </div>
                  {canInstall && (
                    <Button size="sm" onClick={installApp}>
                      설치
                    </Button>
                  )}
                  {isIOS && (
                    <Button size="sm" variant="outline" onClick={() => setShowIOSGuide(true)}>
                      안내 보기
                    </Button>
                  )}
                </div>
              )}

              {/* 푸시 알림 상태 */}
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-background-tertiary)] p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      pushPermission === 'granted'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : pushPermission === 'denied'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-[var(--color-primary)]/10'
                    }`}
                  >
                    {pushPermission === 'granted' ? (
                      <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : pushPermission === 'denied' ? (
                      <BellOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Bell className="h-5 w-5 text-[var(--color-primary)]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {pushPermission === 'granted'
                        ? '알림 활성화됨'
                        : pushPermission === 'denied'
                          ? '알림 차단됨'
                          : '푸시 알림'}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {pushPermission === 'granted'
                        ? '예배 일정, 출석 투표 알림을 받습니다'
                        : pushPermission === 'denied'
                          ? '브라우저 설정에서 알림을 허용해주세요'
                          : '예배 일정, 출석 투표 알림을 받아보세요'}
                    </p>
                  </div>
                </div>
                {canRequestPush && (
                  <Button size="sm" variant="outline" onClick={requestPushPermission}>
                    허용하기
                  </Button>
                )}
              </div>

              {/* 이미 설치된 경우 간결한 상태 표시 */}
              {isInstalled && (
                <div className="flex items-center gap-3 rounded-lg bg-[var(--color-background-tertiary)] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">앱 설치됨</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      홈 화면에서 바로 실행할 수 있습니다
                    </p>
                  </div>
                </div>
              )}

              {/* iOS 푸시 미지원 안내 */}
              {isIOS && !supportsPushInPWA && !isInstalled && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    iOS에서 푸시 알림을 받으려면 먼저 앱을 홈 화면에 설치해주세요.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* iOS 설치 가이드 모달 */}
          {showIOSGuide && (
            <div className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 duration-300">
              <div className="animate-in slide-in-from-bottom w-full max-w-lg rounded-t-2xl bg-[var(--color-background-secondary)] shadow-2xl duration-300">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <Smartphone className="h-5 w-5 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--color-text-primary)]">
                        새로핌On 설치하기
                      </h2>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        홈 화면에서 바로 실행하세요
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowIOSGuide(false)}
                    className="rounded-full"
                  >
                    ✕
                  </Button>
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        공유 버튼을 탭하세요
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Safari 하단의{' '}
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-background-tertiary)] px-2 py-0.5">
                          <Share className="h-4 w-4" />
                        </span>{' '}
                        버튼
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        &quot;홈 화면에 추가&quot;를 선택
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-background-tertiary)] px-2 py-0.5">
                          <PlusSquare className="h-4 w-4" />홈 화면에 추가
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        &quot;추가&quot;를 탭하세요
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        오른쪽 상단의 추가 버튼을 탭하면 완료!
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-[var(--color-border)] p-4">
                  <Button
                    onClick={() => setShowIOSGuide(false)}
                    className="w-full"
                    variant="outline"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
