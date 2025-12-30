'use client';

import { Music } from 'lucide-react';
import { useServiceScheduleByDate } from '@/hooks/useServiceSchedules';

interface CaptureHeaderProps {
    date: string;
    title?: string;
    conductor?: string;
}

/**
 * 이미지 캡처용 헤더 컴포넌트
 * 날짜, 예배명, 찬양곡명, 봉헌송 연주자, 지휘자 정보를 표시
 */
export default function CaptureHeader({ date, title, conductor }: CaptureHeaderProps) {
    const { data: schedule } = useServiceScheduleByDate(date);

    return (
        <div className="text-center pb-6 mb-6 border-b-2 border-gray-300">
            {/* 1행: 날짜 | 배치표 제목 */}
            <div className="flex items-center justify-center gap-3 text-2xl font-bold text-gray-800">
                <span>{date}</span>
                {title && (
                    <>
                        <span className="text-gray-400">|</span>
                        <span>{title}</span>
                    </>
                )}
            </div>

            {/* 2행: 예배명 + 찬양곡 */}
            {schedule && (
                <div className="flex items-center justify-center gap-3 mt-3 text-lg">
                    <span className="text-gray-600 font-medium">
                        {schedule.service_type || '주일예배'}
                    </span>
                    {schedule.hymn_name && (
                        <>
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                                <Music className="h-5 w-5" />
                                {schedule.hymn_name}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* 3행: 봉헌 + 지휘 (명시적 줄 간격) */}
            <div className="mt-3 space-y-2">
                {schedule?.offertory_performer && (
                    <div className="text-lg text-gray-600 leading-relaxed">
                        봉헌: {schedule.offertory_performer}
                    </div>
                )}
                {conductor && (
                    <div className="text-lg text-gray-600 leading-relaxed">
                        지휘: {conductor}
                    </div>
                )}
            </div>
        </div>
    );
}
