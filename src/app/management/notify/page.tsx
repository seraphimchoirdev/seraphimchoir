'use client';

import { AlertTriangle, BellRing, Loader2, Send } from 'lucide-react';

import { useState } from 'react';

import { MemberMultiSelect } from '@/components/features/notifications/MemberMultiSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { PART_LABELS, SELECTABLE_PARTS } from '@/lib/community/poll-constants';
import { MANUAL_NOTIFY_ROLES } from '@/lib/notifications/notify-constants';
import { showError, showSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

type AudienceType = 'ALL' | 'PART' | 'MEMBERS';

const AUDIENCE_OPTIONS: { value: AudienceType; label: string }[] = [
  { value: 'ALL', label: '전체 대원' },
  { value: 'PART', label: '특정 파트' },
  { value: 'MEMBERS', label: '개인 선택' },
];

/**
 * 임원 포털 — 수동 알림 발송
 * 제목/내용/링크를 작성해 전체/파트/개인 대상으로 인앱 알림 + 웹푸시를 발송한다.
 */
export default function NotifyPage() {
  const { isLoading: authLoading, hasRole } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [audience, setAudience] = useState<AudienceType>('ALL');
  const [targetParts, setTargetParts] = useState<string[]>([]);
  const [targetMemberIds, setTargetMemberIds] = useState<string[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!hasRole([...MANUAL_NOTIFY_ROLES])) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            알림 발송 권한이 없습니다. (관리자·지휘자·매니저 전용)
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const togglePart = (part: string) => {
    setTargetParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  };

  const audienceInvalid =
    (audience === 'PART' && targetParts.length === 0) ||
    (audience === 'MEMBERS' && targetMemberIds.length === 0);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !audienceInvalid;

  const audienceSummary =
    audience === 'ALL'
      ? '전체 대원'
      : audience === 'PART'
        ? targetParts.map((p) => PART_LABELS[p] || p).join(' · ')
        : `선택한 대원 ${targetMemberIds.length}명`;

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || undefined,
          audience:
            audience === 'ALL'
              ? { type: 'ALL' }
              : audience === 'PART'
                ? { type: 'PART', parts: targetParts }
                : { type: 'MEMBERS', memberIds: targetMemberIds },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || '알림 발송에 실패했습니다.');
        return;
      }

      showSuccess(
        `알림을 보냈습니다 — 대상 ${data.targets}명 (알림함 ${data.inserted}건 · 푸시 ${data.pushed}건)`
      );
      setTitle('');
      setBody('');
      setLink('');
      setTargetParts([]);
      setTargetMemberIds([]);
    } catch {
      showError('알림 발송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-[var(--color-primary-500)]" />
            알림 발송
          </CardTitle>
          <p className="text-sm text-[var(--color-text-secondary)]">
            선택한 대상에게 인앱 알림과 푸시 알림을 즉시 보냅니다. 발송 후 취소할 수 없습니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="notify-title">제목</Label>
            <Input
              id="notify-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이번 주 연습 안내"
              maxLength={100}
            />
          </div>

          {/* 내용 */}
          <div className="space-y-2">
            <Label htmlFor="notify-body">내용</Label>
            <textarea
              id="notify-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="알림으로 전달할 내용을 입력하세요."
              maxLength={500}
              rows={4}
              className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-background-primary)] px-3 py-2 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            />
            <p className="text-right text-xs text-[var(--color-text-tertiary)]">
              {body.length}/500
            </p>
          </div>

          {/* 링크 (선택) */}
          <div className="space-y-2">
            <Label htmlFor="notify-link">이동할 링크 (선택)</Label>
            <Input
              id="notify-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/community 처럼 앱 내 경로만 가능"
            />
            {link.trim() !== '' && !link.trim().startsWith('/') && (
              <p className="text-xs text-[var(--color-error-600,#dc2626)]">
                링크는 /로 시작하는 앱 내 경로만 가능합니다.
              </p>
            )}
          </div>

          {/* 대상 */}
          <div className="space-y-2">
            <Label>발송 대상</Label>
            <div className="flex gap-2">
              {AUDIENCE_OPTIONS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    audience === a.value
                      ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                      : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {audience === 'PART' && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SELECTABLE_PARTS.map((part) => (
                  <button
                    key={part}
                    type="button"
                    onClick={() => togglePart(part)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                      targetParts.includes(part)
                        ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white'
                        : 'border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
                    )}
                  >
                    {PART_LABELS[part]}
                  </button>
                ))}
              </div>
            )}

            {audience === 'MEMBERS' && (
              <MemberMultiSelect selectedIds={targetMemberIds} onChange={setTargetMemberIds} />
            )}
          </div>

          {/* 발송 */}
          <Button
            className="w-full"
            disabled={!canSubmit || isSending || (link.trim() !== '' && !link.trim().startsWith('/'))}
            onClick={() => setShowConfirm(true)}
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            알림 보내기
          </Button>

          <ConfirmDialog
            open={showConfirm}
            onOpenChange={setShowConfirm}
            title="알림 발송"
            description={`"${title.trim()}" 알림을 ${audienceSummary}에게 보낼까요? 발송 후 취소할 수 없습니다.`}
            confirmLabel="발송"
            onConfirm={handleSend}
          />
        </CardContent>
      </Card>
    </div>
  );
}
