'use client';

import AnnouncementSection from './AnnouncementSection';
import FixedFooter from './FixedFooter';
import HymnSection from './HymnSection';
import NewsletterHeader from './NewsletterHeader';
import PrayerSection from './PrayerSection';

interface NewsletterViewProps {
  issueDate: string;
  volume: number;
  issueNumber: number;
  serialNumber: number;
  yearMotto?: string | null;
  publisherName?: string | null;
  editorName?: string | null;
  editorWeeklyName?: string | null;
  announcements: string;
  fixedFooterText: string;
  editable?: boolean;
}

export default function NewsletterView({
  issueDate,
  volume,
  issueNumber,
  serialNumber,
  yearMotto,
  publisherName,
  editorName,
  editorWeeklyName,
  announcements,
  fixedFooterText,
  editable,
}: NewsletterViewProps) {
  return (
    <div className="mx-auto max-w-[210mm] space-y-6 bg-white p-4 sm:p-8 shadow-lg print:shadow-none print:p-0">
      <NewsletterHeader
        issueDate={issueDate}
        volume={volume}
        issueNumber={issueNumber}
        serialNumber={serialNumber}
        yearMotto={yearMotto}
        publisherName={publisherName}
        editorName={editorName}
        editorWeeklyName={editorWeeklyName}
      />

      <PrayerSection issueDate={issueDate} editable={editable} />

      <HymnSection issueDate={issueDate} />

      <AnnouncementSection announcements={announcements} />

      <FixedFooter text={fixedFooterText} />
    </div>
  );
}
