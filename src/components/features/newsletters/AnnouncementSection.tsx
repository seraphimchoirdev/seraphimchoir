import { Pin } from 'lucide-react';

const PIN_PREFIX = '[pin]';

interface AnnouncementSectionProps {
  announcements: string;
}

export default function AnnouncementSection({ announcements }: AnnouncementSectionProps) {
  const lines = announcements
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const { normal, pinned } = lines.reduce(
    (acc, line) => {
      if (line.startsWith(PIN_PREFIX)) {
        acc.pinned.push(line.slice(PIN_PREFIX.length));
      } else {
        acc.normal.push(line);
      }
      return acc;
    },
    { normal: [] as string[], pinned: [] as string[] }
  );

  const hasItems = normal.length > 0 || pinned.length > 0;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
        알림
      </h2>

      {!hasItems ? (
        <p className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
          등록된 알림이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {/* 일반 항목 */}
          {normal.length > 0 && (
            <ul className="space-y-2 pl-1">
              {normal.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--color-text-primary)]">
                  <span className="mt-0.5 text-[var(--color-primary-500)]">&#9679;</span>
                  <span className="flex-1">{line}</span>
                </li>
              ))}
            </ul>
          )}

          {/* 구분선 + 고정 항목 */}
          {pinned.length > 0 && (
            <>
              {normal.length > 0 && (
                <div className="border-t border-dashed border-[var(--color-border)]" />
              )}
              <ul className="space-y-2 pl-1">
                {pinned.map((line, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[var(--color-text-primary)]">
                    <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary-500)]" />
                    <span className="flex-1">{line}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
