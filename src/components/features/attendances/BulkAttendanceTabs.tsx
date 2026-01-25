'use client';

import { useState } from 'react';

import AttendanceImporter from './AttendanceImporter';
import BulkAttendanceForm from './BulkAttendanceForm';

/**
 * 탭 전환 UI (일괄 입력 폼 vs CSV 업로드)
 */
export default function BulkAttendanceTabs() {
  const [activeTab, setActiveTab] = useState<'form' | 'csv'>('form');

  return (
    <>
      {/* 탭 버튼 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('form')}
            className={`border-b-2 px-1 pb-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'form'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } `}
          >
            📝 날짜별 일괄 입력
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`border-b-2 px-1 pb-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'csv'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } `}
          >
            📄 CSV 파일 업로드
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="mt-6">
        {activeTab === 'form' && (
          <div>
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">📝 날짜별 일괄 입력</h3>
              <p className="text-sm text-blue-700">
                특정 날짜의 출석을 한 번에 입력할 수 있습니다. 각 찬양대원별로 출석 여부를 선택하고
                불참 사유를 입력할 수 있습니다.
              </p>
            </div>
            <BulkAttendanceForm />
          </div>
        )}

        {activeTab === 'csv' && (
          <div>
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-green-900">📄 CSV 파일 업로드</h3>
              <p className="mb-2 text-sm text-green-700">
                CSV 파일을 통해 여러 날짜의 출석 데이터를 한 번에 업로드할 수 있습니다.
              </p>
              <div className="text-sm text-green-700">
                <p className="mb-1 font-medium">CSV 형식:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>member_id 또는 member_name (필수)</li>
                  <li>date: YYYY-MM-DD 형식 (필수)</li>
                  <li>is_available: true/false, 참석/불참, o/x 등 (필수)</li>
                  <li>notes: 불참 사유 (선택)</li>
                </ul>
              </div>
            </div>
            <AttendanceImporter />
          </div>
        )}
      </div>
    </>
  );
}
