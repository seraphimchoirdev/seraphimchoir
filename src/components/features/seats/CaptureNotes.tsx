'use client';

/**
 * 이미지 캡처용 지시사항/메모 컴포넌트
 * Tiptap에서 저장한 HTML을 그대로 렌더링
 */
export default function CaptureNotes({ notes }: { notes: string }) {
  if (!notes || notes === '<p></p>') return null;

  return (
    <div className="mt-4 border-t border-dashed border-gray-300 pt-4">
      <div className="mb-2 text-sm font-bold text-gray-700">📋 안내 메모</div>
      <div
        className="max-w-none text-sm leading-relaxed text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
        dangerouslySetInnerHTML={{ __html: notes }}
      />
    </div>
  );
}
