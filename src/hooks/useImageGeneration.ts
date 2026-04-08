'use client';

import { toBlob, toPng } from 'html-to-image';

import { useCallback, useState } from 'react';

import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ImageGeneration' });

// lg 기준 zigzag offset: (72px seat + 8px gap) / 2 = 40px
const CAPTURE_ZIGZAG_OFFSET = 40;

// Android에서 안전한 캔버스 최대 픽셀 수 (너비 × 높이)
// Samsung Internet / Chrome on Android: ~16384×16384 이지만 메모리 제한이 더 빡빡
const MAX_CANVAS_PIXELS = 16_777_216; // 4096 × 4096

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
  return !!navigator.share && !!navigator.canShare;
};

/**
 * 요소 크기와 scale로부터 안전한 pixelRatio를 계산
 * 캔버스 최대 크기 제한을 넘지 않도록 scale을 자동 조정
 */
function getSafeScale(element: HTMLElement, desiredScale: number): number {
  const rect = element.getBoundingClientRect();
  const width = rect.width * desiredScale;
  const height = rect.height * desiredScale;
  const pixels = width * height;

  if (pixels <= MAX_CANVAS_PIXELS) {
    return desiredScale;
  }

  // 캔버스 크기 초과 시 scale을 줄여서 제한 내로 맞춤
  const safeScale = Math.sqrt(MAX_CANVAS_PIXELS / (rect.width * rect.height));
  const clamped = Math.max(1, Math.floor(safeScale * 10) / 10); // 0.1 단위로 내림
  logger.warn(
    `캔버스 크기 제한: ${Math.round(width)}×${Math.round(height)} → scale ${desiredScale} → ${clamped}`
  );
  return clamped;
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

  const isMobile = checkIsMobile();
  const canShare = checkCanShare();

  /**
   * DOM 요소를 PNG Blob으로 변환
   * 갤럭시 폴드 등 고해상도 대형 기기 대응:
   * - toBlob 직접 사용 (toPng의 base64 중간 변환 제거로 메모리 절약)
   * - 캔버스 크기 초과 시 scale 자동 조정
   * - 첫 시도 실패 시 scale을 낮춰 재시도
   */
  const captureToBlob = useCallback(
    async (element: HTMLElement): Promise<Blob> => {
      // 1. 캡처 모드 활성화: lg 기준 CSS 오버라이드
      element.setAttribute('data-capture-mode', 'true');

      // 2. zigzag offset을 lg 기준(40px)으로 재계산
      const seatRows = element.querySelectorAll<HTMLElement>('[data-seat-row]');
      const originalMargins: string[] = [];
      seatRows.forEach((row) => {
        originalMargins.push(row.style.marginLeft);
        const rowOffset = parseFloat(row.dataset.rowOffset || '0');
        row.style.marginLeft = `${rowOffset * 2 * CAPTURE_ZIGZAG_OFFSET}px`;
      });

      // 3. 캡처 모드: data-seat-slot 요소들의 배경만 투명화 (테두리는 유지)
      const seatSlots = element.querySelectorAll<HTMLElement>('[data-seat-slot]');
      const originalStyles: { backgroundColor: string }[] = [];
      seatSlots.forEach((slot) => {
        originalStyles.push({
          backgroundColor: slot.style.backgroundColor,
        });
        slot.style.backgroundColor = 'transparent';
      });

      const toBlobOptions = (pixelRatio: number) => ({
        pixelRatio,
        backgroundColor,
        cacheBust: true,
        includeQueryParams: true,
        style: {
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif',
        },
        skipFonts: true,
        filter: (node: Element) => {
          if (node instanceof HTMLElement && node.dataset.captureIgnore !== undefined) {
            return false;
          }
          return true;
        },
      });

      try {
        // 안전한 scale 계산 (캔버스 최대 크기 제한)
        const safeScale = getSafeScale(element, scale);

        // 전략 1: toBlob 직접 사용 (메모리 효율적)
        let blob: Blob | null = null;
        try {
          blob = await toBlob(element, toBlobOptions(safeScale));
        } catch (e) {
          logger.warn('toBlob 실패, toPng fallback으로 전환:', e);
        }

        // 전략 2: toBlob 실패 시 scale 낮춰 재시도
        if (!blob && safeScale > 1) {
          logger.warn(`scale ${safeScale}에서 실패, scale 1로 재시도`);
          try {
            blob = await toBlob(element, toBlobOptions(1));
          } catch {
            // 다음 전략으로 진행
          }
        }

        // 전략 3: toBlob이 모두 실패하면 toPng + 수동 Blob 변환 (기존 방식)
        if (!blob) {
          logger.warn('toBlob 모두 실패, toPng fallback 사용');
          const fallbackScale = Math.min(safeScale, 1.5);
          const dataUrl = await toPng(element, toBlobOptions(fallbackScale));
          const base64Data = dataUrl.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: 'image/png' });
        }

        if (!blob) {
          throw new Error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
        }

        return blob;
      } finally {
        // 원래 스타일 복원
        element.removeAttribute('data-capture-mode');
        seatRows.forEach((row, i) => {
          row.style.marginLeft = originalMargins[i];
        });
        seatSlots.forEach((slot, i) => {
          slot.style.backgroundColor = originalStyles[i].backgroundColor;
        });
      }
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
        if (checkIsIOSSafari()) {
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

        // 기타 브라우저: 일반 다운로드
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

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
   */
  const copyToClipboard = useCallback(
    async (element: HTMLElement): Promise<void> => {
      setIsGenerating(true);
      try {
        const blob = await captureToBlob(element);

        if (!navigator.clipboard?.write) {
          throw new Error('CLIPBOARD_NOT_SUPPORTED');
        }

        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
      } catch (error) {
        if (error instanceof Error && error.message === 'CLIPBOARD_NOT_SUPPORTED') {
          throw new Error(
            '이 브라우저에서는 클립보드 복사를 지원하지 않습니다. "공유하기"를 사용해주세요.'
          );
        }
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
   * Blob을 다운로드 링크로 저장하는 내부 헬퍼
   */
  const saveBlobAsDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  /**
   * Web Share API를 사용하여 이미지 공유 (모바일 최적화)
   * 이미지 생성이 오래 걸려 user gesture가 만료되면 다운로드로 fallback
   */
  const shareImage = useCallback(
    async (element: HTMLElement, filename: string): Promise<void> => {
      setIsGenerating(true);
      try {
        const blob = await captureToBlob(element);
        const file = new File([blob], `${filename}.png`, { type: 'image/png' });

        if (navigator.canShare && !navigator.canShare({ files: [file] })) {
          throw new Error('SHARE_NOT_SUPPORTED');
        }

        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: '자리배치표',
          });
        } catch (shareError) {
          // NotAllowedError: 이미지 생성이 오래 걸려 user gesture 만료
          // → 다운로드로 자동 fallback
          if (shareError instanceof DOMException && shareError.name === 'NotAllowedError') {
            logger.warn('공유 user gesture 만료, 다운로드로 fallback');
            saveBlobAsDownload(blob, filename);
            return;
          }
          throw shareError;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        if (error instanceof Error && error.message === 'SHARE_NOT_SUPPORTED') {
          throw new Error('이 기기에서는 파일 공유를 지원하지 않습니다. "이미지 저장"을 사용해주세요.');
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
