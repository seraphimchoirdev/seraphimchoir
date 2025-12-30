/**
 * 배치 성능 리포트 모달
 */
'use client';

import { X, Users, LayoutGrid, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ArrangementAnalysisResponse } from '@/types/analysis';

interface PerformanceReportModalProps {
  analysis: ArrangementAnalysisResponse;
  onClose: () => void;
}

// 파트 이름 한글화
const PART_NAMES: Record<string, string> = {
  SOPRANO: '소프라노',
  ALTO: '알토',
  TENOR: '테너',
  BASS: '베이스',
  SPECIAL: '특별',
};

// 파트별 색상
const PART_COLORS: Record<string, string> = {
  SOPRANO: 'bg-pink-100 text-pink-700 border-pink-200',
  ALTO: 'bg-purple-100 text-purple-700 border-purple-200',
  TENOR: 'bg-blue-100 text-blue-700 border-blue-200',
  BASS: 'bg-green-100 text-green-700 border-green-200',
  SPECIAL: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function PerformanceReportModal({
  analysis,
  onClose,
}: PerformanceReportModalProps) {
  const { placementRate, partDistribution, rowDistribution, summary } = analysis;

  // 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 프로그레스 바 색상
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 파트 정렬 순서
  const partOrder = ['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL'];
  const sortedParts = Object.entries(partDistribution).sort((a, b) => {
    const indexA = partOrder.indexOf(a[0]);
    const indexB = partOrder.indexOf(b[0]);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-blue-600" />
            배치 분석 리포트
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 컨텐츠 */}
        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* 요약 섹션 */}
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className={`text-4xl font-bold ${getScoreColor(summary.overallScore)}`}>
              {summary.overallScore}점
            </div>
            <p className="text-gray-600 mt-1">{summary.message}</p>
          </div>

          {/* 배치율 섹션 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              배치율
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {placementRate.placed}/{placementRate.available}명
                </span>
                <span className={`text-lg font-semibold ${getScoreColor(placementRate.percentage)}`}>
                  {placementRate.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(placementRate.percentage)}`}
                  style={{ width: `${placementRate.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 파트별 분포 섹션 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Layers className="h-4 w-4" />
              파트별 분포
            </div>
            <div className="grid gap-2">
              {sortedParts.map(([part, info]) => (
                <div
                  key={part}
                  className={`flex items-center justify-between p-3 rounded-lg border ${PART_COLORS[part] || 'bg-gray-100 border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium min-w-[70px]">
                      {PART_NAMES[part] || part}
                    </span>
                    <span className="text-lg font-bold">{info.count}명</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {info.columnRange
                      ? `${info.columnRange.min + 1}~${info.columnRange.max + 1}열`
                      : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 행별 현황 섹션 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <LayoutGrid className="h-4 w-4" />
              행별 인원 현황
            </div>
            <div className="space-y-2">
              {rowDistribution.map((row) => {
                const occupancyRate = row.totalSeats > 0
                  ? Math.round((row.occupied / row.totalSeats) * 100)
                  : 0;

                return (
                  <div key={row.row} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">
                        {row.row + 1}줄
                      </span>
                      <span className="text-sm text-gray-600">
                        {row.occupied}/{row.totalSeats}석 ({occupancyRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(occupancyRate)}`}
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                    {/* 파트별 상세 */}
                    {Object.keys(row.partBreakdown).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(row.partBreakdown)
                          .sort((a, b) => {
                            const indexA = partOrder.indexOf(a[0]);
                            const indexB = partOrder.indexOf(b[0]);
                            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                          })
                          .map(([part, count]) => (
                            <span
                              key={part}
                              className={`text-xs px-2 py-0.5 rounded-full ${PART_COLORS[part] || 'bg-gray-100'}`}
                            >
                              {PART_NAMES[part]?.[0] || part[0]} {count}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose} className="w-full">
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
