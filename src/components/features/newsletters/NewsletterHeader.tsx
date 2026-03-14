interface NewsletterHeaderProps {
  issueDate: string;
  volume: number;
  issueNumber: number;
  serialNumber: number;
  yearMotto?: string | null;
  publisherName?: string | null;
  editorName?: string | null;
  editorWeeklyName?: string | null;
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function NewsletterHeader({
  issueDate,
  volume,
  issueNumber,
  serialNumber,
  yearMotto,
  publisherName,
  editorName,
  editorWeeklyName,
}: NewsletterHeaderProps) {
  return (
    <div className="border-b-2 border-[var(--color-primary-600)] pb-4">
      {/* 제호 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-wider text-[var(--color-primary-700)]">
          새 로 핌 지
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          제{volume}권 {issueNumber}호 (통권 {serialNumber}호)
        </p>
      </div>

      {/* 날짜 및 발행인 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary)]">
        <span>{formatKoreanDate(issueDate)}</span>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {publisherName && <span>발행인: {publisherName}</span>}
          {editorName && <span>편집인: {editorName}</span>}
          {editorWeeklyName && <span>편집주간: {editorWeeklyName}</span>}
        </div>
      </div>

      {/* 연도 표어 */}
      {yearMotto && (
        <div className="mt-2 rounded bg-[var(--color-primary-50)] px-3 py-1.5 text-center text-sm font-medium text-[var(--color-primary-700)]">
          {yearMotto}
        </div>
      )}
    </div>
  );
}
