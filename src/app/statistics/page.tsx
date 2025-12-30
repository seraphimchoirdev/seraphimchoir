'use client';

import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import AttendanceStatistics from '@/components/features/attendances/AttendanceStatistics';
import MemberAttendanceStats from '@/components/features/attendances/MemberAttendanceStats';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users } from 'lucide-react';

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState<string>('part-stats');

  return (
    <div className="min-h-screen bg-[var(--color-background-tertiary)]">
      <Navigation />

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 헤더 */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="heading-2 text-[var(--color-text-primary)]">출석 통계</h2>
                <p className="mt-1 body-base text-[var(--color-text-secondary)]">
                  파트별, 대원별 출석 현황을 분석합니다.
                </p>
              </div>

              {/* 탭 선택 */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="part-stats">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    파트별 통계
                  </TabsTrigger>
                  <TabsTrigger value="member-stats">
                    <Users className="h-4 w-4 mr-2" />
                    대원별 통계
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* 탭 컨텐츠 */}
          {activeTab === 'part-stats' && <AttendanceStatistics />}
          {activeTab === 'member-stats' && <MemberAttendanceStats />}
        </div>
      </div>
    </div>
  );
}
