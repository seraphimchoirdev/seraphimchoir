'use client';

import { RefObject, useCallback } from 'react';

import { useImageGeneration } from '@/hooks/useImageGeneration';
import { createLogger } from '@/lib/logger';
import { showError, showSuccess, showWarning } from '@/lib/toast';

const logger = createLogger({ prefix: 'ImageExport' });

interface UseImageExportHandlersOptions {
  getFilename: () => string;
  desktopCaptureRef?: RefObject<HTMLDivElement | null>;
  mobileCaptureRef?: RefObject<HTMLDivElement | null>;
  /** 언마운트 후 상태 업데이트 방지 (ArrangementHeader용) */
  isMountedRef?: RefObject<boolean>;
  /** 에러 시 재시도 콜백 포함 여부 (ArrangementHeader용) */
  enableRetry?: boolean;
}

/**
 * 이미지 내보내기 핸들러 공통 훅
 * - 다운로드, 클립보드 복사, 공유 3가지 핸들러 제공
 * - 뷰포트 기반으로 데스크톱/모바일 캡처 ref 자동 선택
 */
export function useImageExportHandlers({
  getFilename,
  desktopCaptureRef,
  mobileCaptureRef,
  isMountedRef,
  enableRetry = false,
}: UseImageExportHandlersOptions) {
  const { isGenerating, downloadAsImage, copyToClipboard, shareImage, canShare, isMobile } =
    useImageGeneration();

  const getActiveCaptureRef = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return desktopCaptureRef;
    }
    return mobileCaptureRef;
  }, [desktopCaptureRef, mobileCaptureRef]);

  const shouldUpdate = useCallback(() => {
    return isMountedRef ? isMountedRef.current : true;
  }, [isMountedRef]);

  const handleDownloadImage = useCallback(async () => {
    const captureRef = getActiveCaptureRef();
    if (!captureRef?.current) {
      showWarning('캡처할 영역을 찾을 수 없습니다.');
      return;
    }
    try {
      const filename = getFilename();
      await downloadAsImage(captureRef.current, filename);
      if (shouldUpdate()) {
        showSuccess('이미지가 다운로드되었습니다.');
      }
    } catch (error) {
      logger.error('이미지 다운로드 실패:', error);
      if (shouldUpdate()) {
        showError(
          '이미지 다운로드에 실패했습니다.',
          enableRetry ? handleDownloadImage : undefined
        );
      }
    }
  }, [getFilename, downloadAsImage, getActiveCaptureRef, shouldUpdate, enableRetry]);

  const handleCopyToClipboard = useCallback(async () => {
    const captureRef = getActiveCaptureRef();
    if (!captureRef?.current) {
      showWarning('캡처할 영역을 찾을 수 없습니다.');
      return;
    }
    try {
      await copyToClipboard(captureRef.current);
      if (shouldUpdate()) {
        showSuccess('이미지가 클립보드에 복사되었습니다.');
      }
    } catch (error) {
      logger.error('클립보드 복사 실패:', error);
      if (shouldUpdate()) {
        const message = error instanceof Error ? error.message : '클립보드 복사에 실패했습니다.';
        showError(message);
      }
    }
  }, [copyToClipboard, getActiveCaptureRef, shouldUpdate]);

  const handleShareImage = useCallback(async () => {
    const captureRef = getActiveCaptureRef();
    if (!captureRef?.current) {
      showWarning('캡처할 영역을 찾을 수 없습니다.');
      return;
    }
    try {
      const filename = getFilename();
      await shareImage(captureRef.current, filename);
    } catch (error) {
      logger.error('이미지 공유 실패:', error);
      if (shouldUpdate()) {
        const message = error instanceof Error ? error.message : '이미지 공유에 실패했습니다.';
        showError(message);
      }
    }
  }, [getFilename, shareImage, getActiveCaptureRef, shouldUpdate]);

  return {
    handleDownloadImage,
    handleCopyToClipboard,
    handleShareImage,
    isGenerating,
    canShare,
    isMobile,
  };
}
