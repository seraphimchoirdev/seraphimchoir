'use client';

import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pin, Plus, Save, Send, X } from 'lucide-react';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  useCreateNewsletter,
  useLatestNewsletterMeta,
  useNewsletter,
  usePublishNewsletter,
  useUpdateNewsletter,
} from '@/hooks/useNewsletters';

import { showError, showSuccess } from '@/lib/toast';

import NewsletterView from './NewsletterView';

interface NewsletterEditorProps {
  /** 기존 소식지 ID (편집 모드), undefined면 새 작성 */
  newsletterId?: string;
  /** MANAGER인 경우 announcements만 수정 가능 */
  announcementsOnly?: boolean;
}

const DEFAULT_FOOTER = '후원계좌: 국민 293801-01-184111 (새로핌찬양대)';
const DEFAULT_PINNED_ANNOUNCEMENT = '[pin]둘째주, 넷째주 연습 전에는 목사님의 성경 공부가 있으며, 성경 공부 직후 찬양연습을 진행합니다.';

const PIN_PREFIX = '[pin]';
const isPinned = (item: string) => item.startsWith(PIN_PREFIX);
const getDisplayText = (item: string) => isPinned(item) ? item.slice(PIN_PREFIX.length) : item;

// 호수 자동 계산 기준점: 2026-03-01 = 제41권 9호, 통권 1984호
const BASELINE = {
  date: '2026-03-01',
  volume: 41,
  issueNumber: 9,
  serialNumber: 1984,
} as const;

/**
 * 기준점으로부터 주차 차이를 계산하여 호수 산출.
 * 매주 주일마다 1호씩 증가하며, 연도가 바뀌면 issue_number는 1부터 다시 시작.
 */
function calcIssueNumbers(issueDate: string) {
  const base = new Date(BASELINE.date + 'T00:00:00');
  const target = new Date(issueDate + 'T00:00:00');
  const diffWeeks = Math.round((target.getTime() - base.getTime()) / (7 * 24 * 60 * 60 * 1000));

  const serialNumber = BASELINE.serialNumber + diffWeeks;

  // 연도별 issue_number 계산: 기준점의 연도/호를 기반으로
  const baseYear = base.getFullYear();
  const targetYear = target.getFullYear();
  const yearDiff = targetYear - baseYear;

  if (yearDiff === 0) {
    return {
      volume: BASELINE.volume,
      issueNumber: BASELINE.issueNumber + diffWeeks,
      serialNumber,
    };
  }

  // 다른 연도: 기준 연도의 마지막 주일까지 몇 주인지 계산 후 나머지를 새 연도 호수로
  // 간단 접근: 기준 연도 말(12/31)까지 남은 주 수로 그 해 마지막 호 산출
  const endOfBaseYear = new Date(`${baseYear}-12-31T00:00:00`);
  // 기준점부터 연말까지의 주일 수 (기준점 포함)
  const weeksToEndOfYear = Math.round((endOfBaseYear.getTime() - base.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const lastIssueOfBaseYear = BASELINE.issueNumber + weeksToEndOfYear;

  // 매년 약 52~53호. 타겟 연도 1/1부터의 주차로 issueNumber 산출
  const startOfTargetYear = new Date(`${targetYear}-01-01T00:00:00`);
  const weeksFromTargetYearStart = Math.round((target.getTime() - startOfTargetYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  // 그 해 첫 주일이 1호
  const issueNumber = weeksFromTargetYearStart + 1;

  return {
    volume: BASELINE.volume + yearDiff,
    issueNumber,
    serialNumber,
  };
}

/**
 * 다음 주일 날짜 계산
 */
function getNextSunday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function NewsletterEditor({ newsletterId, announcementsOnly }: NewsletterEditorProps) {
  const router = useRouter();
  const isEditMode = !!newsletterId;

  const { data: existing, isLoading: loadingExisting } = useNewsletter(newsletterId);
  const { data: latestMeta } = useLatestNewsletterMeta();

  const createMutation = useCreateNewsletter();
  const updateMutation = useUpdateNewsletter();
  const publishMutation = usePublishNewsletter();

  const [showPreview, setShowPreview] = useState(false);

  // 폼 상태 — 기준점 기반 자동 계산
  const initialDate = getNextSunday();
  const initialCalc = calcIssueNumbers(initialDate);
  const [issueDate, setIssueDate] = useState(initialDate);
  const [volume, setVolume] = useState(initialCalc.volume);
  const [issueNumber, setIssueNumber] = useState(initialCalc.issueNumber);
  const [serialNumber, setSerialNumber] = useState(initialCalc.serialNumber);
  const [yearMotto, setYearMotto] = useState('성령 안에 하나되어, 예수님만 높이는 새로핌 찬양대');
  const [publisherName, setPublisherName] = useState('송혁진');
  const [editorName, setEditorName] = useState('김택훈');
  const [editorWeeklyName, setEditorWeeklyName] = useState('이수지');
  const [metaAutoFilled, setMetaAutoFilled] = useState(false);
  const [announcementItems, setAnnouncementItems] = useState<string[]>(['', DEFAULT_PINNED_ANNOUNCEMENT]);
  const [fixedFooterText, setFixedFooterText] = useState(DEFAULT_FOOTER);

  // 알림 항목 조작 헬퍼
  const addAnnouncementItem = () => setAnnouncementItems(prev => [...prev, '']);
  const removeAnnouncementItem = (index: number) => {
    setAnnouncementItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [''] : next;
    });
  };
  const updateAnnouncementItem = (index: number, value: string) =>
    setAnnouncementItems(prev => prev.map((item, i) => (i === index ? value : item)));
  const moveAnnouncementItem = (index: number, direction: 'up' | 'down') => {
    setAnnouncementItems(prev => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const togglePinItem = (index: number) => {
    setAnnouncementItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return isPinned(item) ? item.slice(PIN_PREFIX.length) : `${PIN_PREFIX}${item}`;
    }));
  };

  // 기존 소식지 데이터로 초기화 (편집 모드)
  useEffect(() => {
    if (!existing) return;
    setIssueDate(existing.issue_date);
    setVolume(existing.volume);
    setIssueNumber(existing.issue_number);
    setSerialNumber(existing.serial_number);
    setYearMotto(existing.year_motto || '');
    setPublisherName(existing.publisher_name || '');
    setEditorName(existing.editor_name || '');
    setEditorWeeklyName(existing.editor_weekly_name || '');
    const items = existing.announcements?.split('\n').filter(Boolean) ?? [];
    setAnnouncementItems(items.length > 0 ? items : ['']);
    setFixedFooterText(existing.fixed_footer_text || DEFAULT_FOOTER);
  }, [existing]);

  // 새 작성 시: 발행일 변경 → 호수 자동 재계산 (기준점 기반)
  useEffect(() => {
    if (isEditMode) return;
    const calc = calcIssueNumbers(issueDate);
    setVolume(calc.volume);
    setIssueNumber(calc.issueNumber);
    setSerialNumber(calc.serialNumber);
  }, [isEditMode, issueDate]);

  // 새 작성 시: 이전 호에서 발행인/편집인/표어 등 메타 자동 채움
  useEffect(() => {
    if (isEditMode || !latestMeta?.data) return;
    const prev = latestMeta.data;
    setYearMotto(prev.year_motto || '성령 안에 하나되어, 예수님만 높이는 새로핌 찬양대');
    setPublisherName(prev.publisher_name || '송혁진');
    setEditorName(prev.editor_name || '김택훈');
    setEditorWeeklyName(prev.editor_weekly_name || '이수지');
    setMetaAutoFilled(true);
    setFixedFooterText(prev.fixed_footer_text || DEFAULT_FOOTER);
  }, [isEditMode, latestMeta?.data]);

  const handleSave = useCallback(async () => {
    // pin 항목은 하단에 정렬하여 저장
    const filtered = announcementItems.filter(Boolean);
    const normalItems = filtered.filter(item => !isPinned(item));
    const pinnedItems = filtered.filter(item => isPinned(item));
    const announcements = [...normalItems, ...pinnedItems].join('\n');
    const data = {
      issue_date: issueDate,
      volume,
      issue_number: issueNumber,
      serial_number: serialNumber,
      year_motto: yearMotto || null,
      publisher_name: publisherName || null,
      editor_name: editorName || null,
      editor_weekly_name: editorWeeklyName || null,
      announcements,
      fixed_footer_text: fixedFooterText,
    };

    try {
      if (isEditMode && newsletterId) {
        if (announcementsOnly) {
          await updateMutation.mutateAsync({ id: newsletterId, data: { announcements } });
        } else {
          await updateMutation.mutateAsync({ id: newsletterId, data });
        }
        showSuccess('소식지가 저장되었습니다.');
      } else {
        const result = await createMutation.mutateAsync(data);
        showSuccess('소식지가 생성되었습니다.');
        router.push(`/newsletters/edit/${result.id}`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  }, [
    issueDate, volume, issueNumber, serialNumber, yearMotto,
    publisherName, editorName, editorWeeklyName, announcementItems,
    fixedFooterText, isEditMode, newsletterId, announcementsOnly,
    createMutation, updateMutation, router,
  ]);

  const handlePublish = useCallback(async () => {
    if (!newsletterId) {
      showError('먼저 초안을 저장해 주세요.');
      return;
    }
    try {
      await publishMutation.mutateAsync(newsletterId);
      showSuccess('소식지가 발행되었습니다.');
      router.push(`/newsletters/${newsletterId}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : '발행에 실패했습니다.');
    }
  }, [newsletterId, publishMutation, router]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPublishing = publishMutation.isPending;

  if (isEditMode && loadingExisting) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 액션 바 */}
      <div className="flex items-center gap-3 flex-wrap" data-print-hide>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(p => !p)}
        >
          {showPreview ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
          {showPreview ? '편집으로' : '미리보기'}
        </Button>

        <div className="flex-1" />

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          {isEditMode ? '저장' : '초안 저장'}
        </Button>

        {isEditMode && !announcementsOnly && existing?.status === 'DRAFT' && (
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-[var(--color-success-600)] text-white hover:bg-[var(--color-success-700)]"
          >
            {isPublishing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            발행
          </Button>
        )}
      </div>

      {showPreview ? (
        <NewsletterView
          issueDate={issueDate}
          volume={volume}
          issueNumber={issueNumber}
          serialNumber={serialNumber}
          yearMotto={yearMotto}
          publisherName={publisherName}
          editorName={editorName}
          editorWeeklyName={editorWeeklyName}
          announcements={announcementItems.filter(Boolean).join('\n')}
          fixedFooterText={fixedFooterText}
        />
      ) : (
        <div className="space-y-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          {/* 기본 정보 */}
          {!announcementsOnly && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">발행일 (주일 날짜)</label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">제N권</label>
                    <Input
                      type="number"
                      min={1}
                      value={volume}
                      onChange={e => setVolume(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">N호</label>
                    <Input
                      type="number"
                      min={1}
                      value={issueNumber}
                      onChange={e => setIssueNumber(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">통권</label>
                    <Input
                      type="number"
                      min={1}
                      value={serialNumber}
                      onChange={e => setSerialNumber(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* 발행인/편집인 */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    발행인
                    {metaAutoFilled && !isEditMode && (
                      <span className="ml-1.5 text-xs font-normal text-[var(--color-text-tertiary)]">(자동 입력)</span>
                    )}
                  </label>
                  <Input value={publisherName} onChange={e => setPublisherName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    편집인
                    {metaAutoFilled && !isEditMode && (
                      <span className="ml-1.5 text-xs font-normal text-[var(--color-text-tertiary)]">(자동 입력)</span>
                    )}
                  </label>
                  <Input value={editorName} onChange={e => setEditorName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    편집주간
                    {metaAutoFilled && !isEditMode && (
                      <span className="ml-1.5 text-xs font-normal text-[var(--color-text-tertiary)]">(자동 입력)</span>
                    )}
                  </label>
                  <Input value={editorWeeklyName} onChange={e => setEditorWeeklyName(e.target.value)} />
                </div>
              </div>

              {/* 연도 표어 */}
              <div>
                <label className="mb-1 block text-sm font-medium">연도 표어</label>
                <Input
                  value={yearMotto}
                  onChange={e => setYearMotto(e.target.value)}
                  placeholder="예: 기도로 세워가는 믿음의 공동체"
                />
              </div>
            </>
          )}

          {/* 자동 섹션 안내 */}
          {!announcementsOnly && (
            <div className="rounded-md bg-[var(--color-info-50)] p-4 text-sm text-[var(--color-info-700)]">
              <p className="font-medium">자동 영역 안내</p>
              <p className="mt-1">섹션 1 (기도 담당)과 섹션 2 (찬양곡 목록)는 DB에서 자동 조회됩니다. 미리보기에서 확인하세요.</p>
            </div>
          )}

          {/* 알림 (섹션 3) — 항목별 리스트 */}
          <div>
            <label className="mb-2 block text-sm font-medium">알림</label>
            <div className="space-y-2">
              {announcementItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  {/* 순서 변경 버튼 */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveAnnouncementItem(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)] disabled:opacity-30"
                      aria-label="위로 이동"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveAnnouncementItem(idx, 'down')}
                      disabled={idx === announcementItems.length - 1}
                      className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)] disabled:opacity-30"
                      aria-label="아래로 이동"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* 입력 필드 */}
                  <Input
                    value={getDisplayText(item)}
                    onChange={e => {
                      const val = e.target.value;
                      updateAnnouncementItem(idx, isPinned(item) ? `${PIN_PREFIX}${val}` : val);
                    }}
                    placeholder={`알림 항목 ${idx + 1}`}
                    className="flex-1"
                  />
                  {/* 고정 토글 */}
                  <button
                    type="button"
                    onClick={() => togglePinItem(idx)}
                    className={`rounded p-1 ${isPinned(item) ? 'text-[var(--color-primary-600)] bg-[var(--color-primary-50)]' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-secondary)]'}`}
                    aria-label={isPinned(item) ? '고정 해제' : '고정'}
                    title={isPinned(item) ? '고정 해제' : '고정'}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => removeAnnouncementItem(idx)}
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-600)]"
                    aria-label="항목 삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAnnouncementItem}
              className="mt-2"
            >
              <Plus className="mr-1 h-4 w-4" />
              항목 추가
            </Button>
          </div>

          {/* 고정 하단 */}
          {!announcementsOnly && (
            <div>
              <label className="mb-1 block text-sm font-medium">고정 하단 텍스트</label>
              <textarea
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-primary)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                rows={3}
                value={fixedFooterText}
                onChange={e => setFixedFooterText(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
