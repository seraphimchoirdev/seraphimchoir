'use client';

import { useState, useCallback } from 'react';
import { toPng } from 'html-to-image';

interface UseImageGenerationOptions {
    scale?: number;
    backgroundColor?: string;
}

interface UseImageGenerationReturn {
    isGenerating: boolean;
    downloadAsImage: (element: HTMLElement, filename: string) => Promise<void>;
    copyToClipboard: (element: HTMLElement) => Promise<void>;
}

/**
 * DOM 요소를 이미지로 캡처하여 다운로드하거나 클립보드에 복사하는 훅
 * html-to-image 라이브러리 사용 (oklch 등 현대 CSS 지원)
 */
export function useImageGeneration(
    options: UseImageGenerationOptions = {}
): UseImageGenerationReturn {
    const { scale = 2, backgroundColor = '#ffffff' } = options;
    const [isGenerating, setIsGenerating] = useState(false);

    /**
     * DOM 요소를 PNG Blob으로 변환
     */
    const captureToBlob = useCallback(
        async (element: HTMLElement): Promise<Blob> => {
            // html-to-image로 PNG Data URL 생성
            const dataUrl = await toPng(element, {
                pixelRatio: scale,
                backgroundColor,
                cacheBust: true,
                // 외부 폰트 및 이미지 처리
                includeQueryParams: true,
                // 한글 폰트 렌더링 문제 해결을 위한 시스템 폰트 지정
                style: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif',
                },
                // 폰트 로딩 대기
                skipFonts: false,
            });

            // Data URL을 Blob으로 변환
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            if (!blob) {
                throw new Error('이미지 생성에 실패했습니다');
            }

            return blob;
        },
        [scale, backgroundColor]
    );

    /**
     * DOM 요소를 PNG 파일로 다운로드
     */
    const downloadAsImage = useCallback(
        async (element: HTMLElement, filename: string): Promise<void> => {
            setIsGenerating(true);
            try {
                const blob = await captureToBlob(element);
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);
            } finally {
                setIsGenerating(false);
            }
        },
        [captureToBlob]
    );

    /**
     * DOM 요소를 이미지로 캡처하여 클립보드에 복사
     */
    const copyToClipboard = useCallback(
        async (element: HTMLElement): Promise<void> => {
            setIsGenerating(true);
            try {
                const blob = await captureToBlob(element);

                // Clipboard API를 사용하여 이미지 복사
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob,
                    }),
                ]);
            } finally {
                setIsGenerating(false);
            }
        },
        [captureToBlob]
    );

    return {
        isGenerating,
        downloadAsImage,
        copyToClipboard,
    };
}
