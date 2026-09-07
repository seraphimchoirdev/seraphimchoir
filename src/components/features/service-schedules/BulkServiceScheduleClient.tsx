'use client';

import { ArrowLeft, FileSpreadsheet } from 'lucide-react';

import { useRouter } from 'next/navigation';

import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';

import ServiceScheduleImporter from './ServiceScheduleImporter';

/**
 * 일괄 등록 페이지의 클라이언트 껍데기.
 *
 * 서버 컴포넌트에서는 useRouter를 쓸 수 없어 이동 처리를 이 얇은 층이 맡는다.
 * Importer 안에 경로를 박지 않는 이유이기도 하다 — 컴포넌트가 특정 경로를 알면
 * 다른 화면에서 재사용할 수 없다. Importer는 "끝났다"만 알리고, 그 다음에
 * 무엇을 할지는 이 호출부가 정한다.
 */
export default function BulkServiceScheduleClient() {
  const router = useRouter();

  // push가 아니라 replace를 쓴다. 일괄 등록은 완료하면 끝나는 일회성 작업이라,
  // 목록에서 뒤로가기를 눌렀을 때 이미 업로드를 마친 화면으로 돌아가는 건
  // 어색하고 재업로드를 유도할 위험도 있다.
  const goToList = () => {
    router.replace('/service-schedules');
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToList}
            className="mb-3 gap-1.5 text-[var(--color-text-secondary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            일정 목록
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
            <FileSpreadsheet className="h-6 w-6" />
            예배 일정 일괄 등록
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            CSV·엑셀 파일이나 주보 이미지·PDF를 올리면 예배 일정을 한 번에 등록할 수 있습니다.
          </p>
        </div>

        {/*
          onSuccess와 onCancel이 같은 곳으로 가지만 의미가 다르다.
          업로드 성공 후에는 Importer가 결과를 잠깐 보여준 뒤 스스로 onCancel을
          부르므로, 여기서 두 경로를 구분해 처리할 필요는 없다.
        */}
        <ServiceScheduleImporter onCancel={goToList} />
      </div>
    </AppShell>
  );
}
