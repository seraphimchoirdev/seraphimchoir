'use client';

import { useState } from 'react';
import AttendanceStatistics from '@/components/features/attendances/AttendanceStatistics';
import MemberAttendanceStats from '@/components/features/attendances/MemberAttendanceStats';
import StageStatistics from '@/components/features/arrangements/StageStatistics';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Calendar } from 'lucide-react';

export default function ManagementStatisticsPage() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('part-stats');

  // 통계 조회 권한: ADMIN, CONDUCTOR, MANAGER, PART_LEADER
  // 참고: 임원 포털은 STAFF까지 접근하지만, 통계는 PART_LEADER까지만 조회 가능
  const hasPermission = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER']);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" variant="default" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert variant="error">
          <AlertDescription>
            출석 통계 페이지에 접근할 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
          {/* 타이틀 영역 */}
          <div>
            <h2 className="heading-2 text-[var(--color-text-primary)]">출석 통계</h2>
            <p className="mt-1 body-base text-[var(--color-text-secondary)]">
              파트별, 대원별 출석 현황을 분석합니다.
            </p>
          </div>

          {/* 탭 선택 */}
          <div className="pt-4 border-t border-[var(--color-border-subtle)]">
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
                <TabsTrigger value="stage-stats">
                  <Calendar className="h-4 w-4 mr-2" />
                  등단 통계
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'part-stats' && <AttendanceStatistics />}
        {activeTab === 'member-stats' && <MemberAttendanceStats />}
        {activeTab === 'stage-stats' && <StageStatistics />}
      </div>
    </div>
  );
}
