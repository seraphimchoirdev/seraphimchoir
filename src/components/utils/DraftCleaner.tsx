'use client';

import { useEffect } from 'react';

import { useArrangementDraftStore } from '@/store/arrangement-draft-store';

/**
 * 만료된 Draft 정리 컴포넌트
 * 앱 시작 시 7일 이상 된 draft 데이터를 자동 삭제
 * requestIdleCallback으로 지연 실행하여 critical path에서 제거
 */
export default function DraftCleaner() {
  const { clearExpiredDrafts } = useArrangementDraftStore();

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => clearExpiredDrafts());
      return () => window.cancelIdleCallback(id);
    } else {
      // Safari 폴백
      const timer = setTimeout(() => clearExpiredDrafts(), 3000);
      return () => clearTimeout(timer);
    }
  }, [clearExpiredDrafts]);

  return null;
}
