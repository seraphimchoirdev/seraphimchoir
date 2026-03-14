import { Calendar } from 'lucide-react';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';

interface NewsletterCardProps {
  id: string;
  issueDate: string;
  volume: number;
  issueNumber: number;
  serialNumber: number;
  status: string;
  publishedAt?: string | null;
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

export default function NewsletterCard({
  id,
  issueDate,
  volume,
  issueNumber,
  serialNumber,
  status,
}: NewsletterCardProps) {
  return (
    <Link
      href={`/newsletters/${id}`}
      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            제{volume}권 {issueNumber}호
            <span className="ml-2 text-sm font-normal text-[var(--color-text-tertiary)]">
              (통권 {serialNumber}호)
            </span>
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <Calendar className="h-3.5 w-3.5" />
            {formatKoreanDate(issueDate)}
          </p>
        </div>
        <Badge variant={status === 'PUBLISHED' ? 'success' : 'secondary'}>
          {status === 'PUBLISHED' ? '발행됨' : '초안'}
        </Badge>
      </div>
    </Link>
  );
}
