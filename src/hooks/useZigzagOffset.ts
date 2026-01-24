'use client';

import { useState, useEffect } from 'react';

/**
 * 브레이크포인트에 따른 지그재그 오프셋(반칸 이동 거리)을 반환하는 훅
 *
 * 좌석 크기 + 간격의 절반:
 * - mobile (<640px): (48px + 6px) / 2 = 27px
 * - sm (≥640px): (64px + 8px) / 2 = 36px
 * - lg (≥1024px): (72px + 8px) / 2 = 40px
 *
 * @returns 현재 뷰포트에 맞는 zigzag offset 값 (px 단위)
 */
export function useZigzagOffset(): number {
    // SSR에서는 sm 기본값 사용
    const [offset, setOffset] = useState(36);

    useEffect(() => {
        const updateOffset = () => {
            if (window.innerWidth >= 1024) {
                setOffset(40); // lg: (72 + 8) / 2
            } else if (window.innerWidth >= 640) {
                setOffset(36); // sm: (64 + 8) / 2
            } else {
                setOffset(27); // mobile: (48 + 6) / 2
            }
        };

        // 초기 값 설정
        updateOffset();

        // resize 이벤트 리스너
        window.addEventListener('resize', updateOffset);
        return () => window.removeEventListener('resize', updateOffset);
    }, []);

    return offset;
}
