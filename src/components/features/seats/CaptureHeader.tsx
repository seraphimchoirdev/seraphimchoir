'use client';

import { Music } from 'lucide-react';
import { useServiceScheduleByDate } from '@/hooks/useServiceSchedules';

interface CaptureHeaderProps {
    date: string;
    title?: string;
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
 */
export default function CaptureHeader({ date, title }: CaptureHeaderProps) {
    const { data: schedule } = useServiceScheduleByDate(date);
    const formattedDate = formatDateKorean(date);

    return (
        <div className="text-center pb-6 mb-6 border-b-2 border-[var(--color-border-default)]">
            {/* 1행: 제목 - 새로핌찬양대 등단 자리표 */}
            <div className="text-2xl font-bold text-[var(--color-primary-600)]">
                새로핌찬양대 등단 자리표
            </div>

            {/* 2행: 부제 - 날짜 + 예배유형 */}
            <div className="text-lg text-[var(--color-text-primary)] mt-1">
                {formattedDate} {schedule?.service_type || '주일예배'}
            </div>

            {/* 3행: 찬양곡 */}
            {schedule?.hymn_name && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-lg text-[var(--color-primary-600)] font-medium">
                    <Music className="h-5 w-5" />
                    {schedule.hymn_name}
                </div>
            )}

            {/* 4행: 봉헌송 */}
            {schedule?.offertory_performer && (
                <div className="mt-3 text-lg text-[var(--color-text-secondary)] leading-relaxed">
                    봉헌송: {schedule.offertory_performer}
                </div>
            )}
        </div>
    );
}
