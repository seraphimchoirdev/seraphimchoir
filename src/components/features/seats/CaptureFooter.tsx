'use client';

import { useMemo } from 'react';
import type { SeatAssignment } from '@/store/arrangement-store';
import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

interface CaptureFooterProps {
    assignments: Record<string, SeatAssignment>;
}

// 파트 표시 순서 및 약어
const PART_ORDER: Part[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS'];
const PART_ABBR: Record<Part, string> = {
    SOPRANO: 'S',
    ALTO: 'A',
    TENOR: 'T',
    BASS: 'B',
    SPECIAL: 'SP',
};

/**
 * 이미지 캡처용 푸터 컴포넌트
 * 파트별 등단 인원수와 총 등단 인원수를 표시
 */
export default function CaptureFooter({ assignments }: CaptureFooterProps) {
    // 파트별 인원수 계산
    const partCounts = useMemo(() => {
        const counts: Record<Part, number> = {
            SOPRANO: 0,
            ALTO: 0,
            TENOR: 0,
            BASS: 0,
            SPECIAL: 0,
        };

        Object.values(assignments).forEach((assignment) => {
            if (assignment.part in counts) {
                counts[assignment.part]++;
            }
        });

        return counts;
    }, [assignments]);

    const totalCount = Object.values(assignments).length;

    return (
        <div className="text-center pt-6 mt-6 border-t-2 border-gray-300">
            {/* 파트별 인원수 */}
            <div className="flex items-center justify-center gap-4 text-lg">
                {PART_ORDER.map((part) => (
                    <span key={part} className="text-gray-700">
                        <span className="font-bold">{PART_ABBR[part]}</span>
                        <span className="text-gray-600">: {partCounts[part]}명</span>
                    </span>
                ))}
            </div>

            {/* 총 등단 인원수 */}
            <div className="mt-3 text-xl font-bold text-gray-800">
                총 등단 인원: {totalCount}명
            </div>
        </div>
    );
}
