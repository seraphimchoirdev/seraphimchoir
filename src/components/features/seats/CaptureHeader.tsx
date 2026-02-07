'use client';

import { Music } from 'lucide-react';

interface CaptureHeaderProps {
  date: string;
  title?: string;
  serviceType?: string;
  hymnName?: string | null;
  offertoryPerformer?: string | null;
}

/**
 * 날짜를 "yyyy년 m월 d일" 형식으로 변환
 * @param dateStr "yyyy-mm-dd" 형식의 날짜 문자열
 */
function formatDateKorean(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

/**
 * 이미지 캡처용 헤더 컴포넌트
 * 1행: 새로핌찬양대 등단 자리표 (제목)
 * 2행: 날짜 + 예배유형 (부제)
 * 3행: 찬양곡명 (선택)
 * 4행: 봉헌송 연주자 (선택)
 *
 * props로 모든 데이터를 직접 전달받아 API 호출 없이 렌더링합니다.
 * 이미지 캡처 시 캐시/로딩 타이밍 문제를 방지합니다.
 */
export default function CaptureHeader({ date, title: _title, serviceType, hymnName, offertoryPerformer }: CaptureHeaderProps) {
  const formattedDate = formatDateKorean(date);

  return (
    <div className="mb-6 border-b-2 border-[var(--color-border-default)] pb-6 text-center">
      {/* 1행: 제목 - 새로핌찬양대 등단 자리표 */}
      <div className="whitespace-nowrap text-2xl font-bold text-[var(--color-primary-600)]">
        새로핌찬양대 등단 자리표
      </div>

      {/* 2행: 부제 - 날짜 + 예배유형 */}
      <div className="mt-1 whitespace-nowrap text-lg text-[var(--color-text-primary)]">
        {formattedDate} {serviceType || '주일예배'}
      </div>

      {/* 3행: 찬양곡 */}
      {hymnName && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-lg font-medium text-[var(--color-primary-600)]">
          <Music className="h-5 w-5" />
          {hymnName}
        </div>
      )}

      {/* 4행: 봉헌송 */}
      {offertoryPerformer && (
        <div className="mt-3 text-lg leading-relaxed text-[var(--color-text-secondary)]">
          봉헌송: {offertoryPerformer}
        </div>
      )}
    </div>
  );
}
