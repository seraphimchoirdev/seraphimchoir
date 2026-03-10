import { useMemo, useState, useCallback } from 'react';

import { useServiceSchedules } from '@/hooks/useServiceSchedules';
import { formatDate } from '@/lib/dashboard-context';

interface ServiceDateNavigation {
  /** 현재 선택된 날짜 (YYYY-MM-DD) */
  selectedDate: string;
  /** 이전 예배 날짜 존재 여부 */
  hasPrev: boolean;
  /** 다음 예배 날짜 존재 여부 */
  hasNext: boolean;
  /** 이전 날짜로 이동 */
  goToPrev: () => void;
  /** 다음 날짜로 이동 */
  goToNext: () => void;
  /** "이번 주일 예배", "다음 주일 예배" 등 상대 라벨 */
  relativeLabel: string;
  /** 외부에서 날짜를 직접 설정 */
  setDate: (date: string) => void;
  /** 일정 로딩 중 */
  isLoading: boolean;
}

/**
 * 등록된 예배 일정 기준으로 날짜를 prev/next 이동하는 훅
 * - 6개월 전 ~ 3개월 후 범위의 예배 일정에서 unique dates 추출
 * - 일정이 없는 날짜는 자동으로 건너뜀
 */
export function useServiceDateNavigation(): ServiceDateNavigation {
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);

  const startDate = formatDate(sixMonthsAgo);
  const endDate = formatDate(threeMonthsLater);

  const { data: schedules, isLoading } = useServiceSchedules({ startDate, endDate });

  // unique dates를 오름차순 정렬
  const sortedDates = useMemo(() => {
    if (!schedules?.data) return [];
    const dateSet = new Set(schedules.data.map((s) => s.date));
    return Array.from(dateSet).sort();
  }, [schedules]);

  // 가장 가까운 미래 날짜를 기본값으로 설정
  const defaultDate = useMemo(() => {
    const todayStr = formatDate(today);
    const futureDate = sortedDates.find((d) => d >= todayStr);
    return futureDate || sortedDates[sortedDates.length - 1] || todayStr;
  }, [sortedDates, today]);

  const [selectedDate, setSelectedDate] = useState<string>('');

  // 실제 사용할 날짜: selectedDate가 비어있거나 목록에 없으면 defaultDate 사용
  const activeDate = useMemo(() => {
    if (selectedDate && sortedDates.includes(selectedDate)) return selectedDate;
    return defaultDate;
  }, [selectedDate, sortedDates, defaultDate]);

  const currentIndex = useMemo(
    () => sortedDates.indexOf(activeDate),
    [sortedDates, activeDate]
  );

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < sortedDates.length - 1 && currentIndex >= 0;

  const goToPrev = useCallback(() => {
    if (hasPrev) setSelectedDate(sortedDates[currentIndex - 1]);
  }, [hasPrev, sortedDates, currentIndex]);

  const goToNext = useCallback(() => {
    if (hasNext) setSelectedDate(sortedDates[currentIndex + 1]);
  }, [hasNext, sortedDates, currentIndex]);

  // 상대 라벨 계산
  const relativeLabel = useMemo(() => {
    if (!activeDate) return '';

    const todayStr = formatDate(today);
    const selected = new Date(activeDate + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');
    const diffDays = Math.round(
      (selected.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return '오늘 예배';
    if (diffDays > 0 && diffDays <= 7) return '이번 주일 예배';
    if (diffDays > 7 && diffDays <= 14) return '다음 주일 예배';
    if (diffDays < 0 && diffDays >= -7) return '지난 주일 예배';
    return '예배';
  }, [activeDate, today]);

  return {
    selectedDate: activeDate,
    hasPrev,
    hasNext,
    goToPrev,
    goToNext,
    setDate: setSelectedDate,
    relativeLabel,
    isLoading,
  };
}
