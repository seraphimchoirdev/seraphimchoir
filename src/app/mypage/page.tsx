'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/useMyProfile';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/layout/Navigation';
import { Loader2, User, Save, AlertTriangle, Info, Calendar, Music, Users } from 'lucide-react';

const PART_LABELS: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

export default function MyPage() {
  const router = useRouter();
  const { isAuthenticated, isMemberLinked, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const updateMutation = useUpdateMyProfile();

  // 폼 상태
  const [heightCm, setHeightCm] = useState<string>('');
  const [regularMemberSince, setRegularMemberSince] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 프로필 데이터로 폼 초기화
  useEffect(() => {
    if (profile?.member) {
      setHeightCm(profile.member.height_cm?.toString() || '');
      setRegularMemberSince(profile.member.regular_member_since || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const height = parseInt(heightCm, 10);
    if (heightCm && (isNaN(height) || height < 100 || height > 250)) {
      setError('키는 100cm ~ 250cm 사이의 숫자로 입력해주세요.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        height_cm: heightCm ? height : undefined,
        regular_member_since: regularMemberSince || null,
      });
      setSuccess('정보가 수정되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
    }
  };

  // 로딩 중
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              먼저 대원 연결이 필요합니다.{' '}
              <a href="/member-link" className="underline">대원 연결 페이지로 이동</a>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const member = profile?.member;

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)]">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <User className="h-6 w-6" />
            마이페이지
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            내 정보를 확인하고 수정할 수 있습니다.
          </p>
        </div>

        {/* 기본 정보 (수정 불가) */}
        <div className="bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border)] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            기본 정보
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">이름</span>
              <span className="text-[var(--color-text-primary)] font-medium">
                {member?.name || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">파트</span>
              <span className="text-[var(--color-text-primary)] font-medium">
                {member?.part ? PART_LABELS[member.part] || member.part : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">이메일</span>
              <span className="text-[var(--color-text-primary)]">
                {profile?.email || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">정대원 임명일</span>
              <span className="text-[var(--color-text-primary)]">
                {member?.regular_member_since
                  ? new Date(member.regular_member_since).toLocaleDateString('ko-KR')
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 출석 현황 */}
        <div className="bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border)] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            출석 현황
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 최근 등단일 */}
            <div className="bg-[var(--color-background-tertiary)] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-2">
                <Music className="h-4 w-4" />
                <span className="text-sm">최근 등단일</span>
              </div>
              <p className="text-lg font-medium text-[var(--color-text-primary)]">
                {member?.last_service_date
                  ? new Date(member.last_service_date).toLocaleDateString('ko-KR')
                  : '기록 없음'}
              </p>
            </div>
            {/* 최근 연습 출석일 */}
            <div className="bg-[var(--color-background-tertiary)] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">최근 연습 출석일</span>
              </div>
              <p className="text-lg font-medium text-[var(--color-text-primary)]">
                {member?.last_practice_date
                  ? new Date(member.last_practice_date).toLocaleDateString('ko-KR')
                  : '기록 없음'}
              </p>
            </div>
          </div>
        </div>

        {/* 수정 가능한 정보 */}
        <div className="bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            추가 정보 수정
          </h2>

          {error && (
            <Alert variant="error" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 키 입력 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                키 (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="예: 170"
                min={100}
                max={250}
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-md bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>입력하신 키 정보는 AI 자리배치 추천에 활용됩니다.</span>
              </div>
            </div>

            {/* 정대원 임명일 입력 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                정대원 임명일
              </label>
              <input
                type="date"
                value={regularMemberSince}
                onChange={(e) => setRegularMemberSince(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-md bg-[var(--color-background-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <p className="text-xs text-[var(--color-text-tertiary)]">
                정대원으로 임명된 날짜를 입력해주세요.
              </p>
            </div>

            {/* 저장 버튼 */}
            <Button
              type="submit"
              className="w-full"
              disabled={updateMutation.isPending}
            >
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
      </div>
    </div>
  );
}
