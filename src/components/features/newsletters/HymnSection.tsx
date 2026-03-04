import { Loader2 } from 'lucide-react';

import { useServiceSchedules } from '@/hooks/useServiceSchedules';

interface HymnSectionProps {
  issueDate: string;
  weekCount?: number;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 같은 날짜 내 예배 유형 정렬 우선순위 (낮을수록 먼저)
const SERVICE_TYPE_ORDER: Record<string, number> = {
  '주일 2부 예배': 0,
  '오후찬양예배': 1,
  '절기찬양예배': 2,
  '기도회': 3,
};

function getServiceTypeOrder(serviceType: string | null): number {
  return SERVICE_TYPE_ORDER[serviceType || ''] ?? 10;
}

export default function HymnSection({ issueDate, weekCount = 4 }: HymnSectionProps) {
  // 발행일 기준 앞으로 weekCount 주간의 찬양곡 조회
  const endDate = offsetDate(issueDate, (weekCount - 1) * 7);

  const { data: response, isLoading } = useServiceSchedules({
    startDate: issueDate,
    endDate,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // 같은 날짜 내에서 주일 2부 예배 → 오후찬양예배 순으로 정렬
  const schedules = [...(response?.data || [])].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return getServiceTypeOrder(a.service_type) - getServiceTypeOrder(b.service_type);
  });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
        찬양곡 목록
      </h2>

      {schedules.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
          등록된 찬양곡이 없습니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-primary-50)]">
                <th className="px-4 py-2 text-left font-medium text-[var(--color-primary-700)]">날짜</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-primary-700)]">예배</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-primary-700)]">찬양곡</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-primary-700)]">봉헌</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {schedules.map(schedule => (
                <tr key={schedule.id}>
                  <td className="px-4 py-2 font-medium whitespace-nowrap">
                    {formatShortDate(schedule.date)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {schedule.service_type || '주일예배'}
                  </td>
                  <td className="px-4 py-2">
                    {schedule.hymn_name || '-'}
                  </td>
                  <td className="px-4 py-2">
                    {schedule.offertory_performer || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
