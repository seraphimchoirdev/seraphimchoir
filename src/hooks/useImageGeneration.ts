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
    shareImage: (element: HTMLElement, filename: string) => Promise<void>;
    canShare: boolean;
    isMobile: boolean;
}

/**
 * DOM 요소를 이미지로 캡처하여 다운로드하거나 클립보드에 복사하는 훅
 * html-to-image 라이브러리 사용 (oklch 등 현대 CSS 지원)
 */
/**
 * 모바일 기기 감지
 */
const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * iOS Safari 감지
 */
const checkIsIOSSafari = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
    return isIOS && isSafari;
};

/**
 * Web Share API 지원 여부 (파일 공유 포함)
 */
const checkCanShare = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    // navigator.share 존재 여부와 canShare (파일 공유 지원) 확인
    return !!navigator.share && !!navigator.canShare;
};

export function useImageGeneration(
    options: UseImageGenerationOptions = {}
): UseImageGenerationReturn {
    const { scale = 2, backgroundColor = '#ffffff' } = options;
    const [isGenerating, setIsGenerating] = useState(false);

    const isMobile = checkIsMobile();
    const canShare = checkCanShare();

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
                // data-capture-ignore 속성을 가진 요소 제외 (인라인 컨트롤 등)
                filter: (node) => {
                    if (node instanceof HTMLElement && node.dataset.captureIgnore !== undefined) {
                        return false;
                    }
                    return true;
                },
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
     * 모바일 환경에서는 새 탭에서 이미지를 열어 길게 눌러 저장하도록 유도
     */
    const downloadAsImage = useCallback(
        async (element: HTMLElement, filename: string): Promise<void> => {
            setIsGenerating(true);
            try {
                const blob = await captureToBlob(element);
                const url = URL.createObjectURL(blob);

                // iOS Safari는 download 속성을 지원하지 않음
                // 모바일에서는 새 탭에서 열어서 길게 눌러 저장하도록 유도
                if (checkIsIOSSafari()) {
                    // iOS Safari: 새 탭에서 이미지 열기
                    const newWindow = window.open();
                    if (newWindow) {
                        newWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1">
                                <title>${filename}</title>
                                <style>
                                    body { margin: 0; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: #f5f5f5; padding: 20px; }
                                    img { max-width: 100%; height: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                                    .hint { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; text-align: center; }
                                </style>
                            </head>
                            <body>
                                <img src="${url}" alt="${filename}">
                                <div class="hint">이미지를 길게 눌러 저장하세요</div>
                            </body>
                            </html>
                        `);
                        newWindow.document.close();
                    }
                    return;
                }

                // 기타 브라우저: 일반 다운로드 시도
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Android에서 다운로드가 실패할 수 있으므로 약간의 지연 후 URL 해제
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);
            } finally {
                setIsGenerating(false);
            }
        },
        [captureToBlob]
    );

    /**
     * DOM 요소를 이미지로 캡처하여 클립보드에 복사
     * 모바일에서는 Clipboard API 지원이 제한적이므로 에러 처리 강화
     */
    const copyToClipboard = useCallback(
        async (element: HTMLElement): Promise<void> => {
            setIsGenerating(true);
            try {
                const blob = await captureToBlob(element);

                // Clipboard API 지원 여부 확인
                if (!navigator.clipboard?.write) {
                    throw new Error('CLIPBOARD_NOT_SUPPORTED');
                }

                // Clipboard API를 사용하여 이미지 복사
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob,
                    }),
                ]);
            } catch (error) {
                // 에러 타입에 따라 구체적인 메시지 전달
                if (error instanceof Error && error.message === 'CLIPBOARD_NOT_SUPPORTED') {
                    throw new Error('이 브라우저에서는 클립보드 복사를 지원하지 않습니다. "공유하기"를 사용해주세요.');
                }
                // NotAllowedError: 권한 문제 (HTTPS 필요 또는 사용자 제스처 필요)
                if (error instanceof DOMException && error.name === 'NotAllowedError') {
                    throw new Error('클립보드 접근이 거부되었습니다. HTTPS 환경에서 다시 시도해주세요.');
                }
                throw error;
            } finally {
                setIsGenerating(false);
            }
        },
        [captureToBlob]
    );

    /**
     * Web Share API를 사용하여 이미지 공유 (모바일 최적화)
     * 카카오톡, 메시지, 이메일 등으로 직접 공유 가능
     */
    const shareImage = useCallback(
        async (element: HTMLElement, filename: string): Promise<void> => {
            setIsGenerating(true);
            try {
                const blob = await captureToBlob(element);
                const file = new File([blob], `${filename}.png`, { type: 'image/png' });

                // canShare로 파일 공유 가능 여부 확인
                if (navigator.canShare && !navigator.canShare({ files: [file] })) {
                    throw new Error('SHARE_NOT_SUPPORTED');
                }

                await navigator.share({
                    files: [file],
                    title: filename,
                    text: '자리배치표',
                });
            } catch (error) {
                // 사용자가 공유를 취소한 경우
                if (error instanceof DOMException && error.name === 'AbortError') {
                    // 취소는 에러로 처리하지 않음
                    return;
                }
                // 공유 미지원
                if (error instanceof Error && error.message === 'SHARE_NOT_SUPPORTED') {
                    throw new Error('이 기기에서는 파일 공유를 지원하지 않습니다.');
                }
                throw error;
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
        shareImage,
        canShare,
        isMobile,
    };
}
