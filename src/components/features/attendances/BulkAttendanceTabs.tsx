'use client';

import { useState } from 'react';
import BulkAttendanceForm from './BulkAttendanceForm';
import AttendanceImporter from './AttendanceImporter';

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
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            📝 날짜별 일괄 입력
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'csv'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            📄 CSV 파일 업로드
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="mt-6">
        {activeTab === 'form' && (
          <div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                📝 날짜별 일괄 입력
              </h3>
              <p className="text-sm text-blue-700">
                특정 날짜의 출석을 한 번에 입력할 수 있습니다. 각 찬양대원별로
                출석 여부를 선택하고 불참 사유를 입력할 수 있습니다.
              </p>
            </div>
            <BulkAttendanceForm />
          </div>
        )}

        {activeTab === 'csv' && (
          <div>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 mb-2">
                📄 CSV 파일 업로드
              </h3>
              <p className="text-sm text-green-700 mb-2">
                CSV 파일을 통해 여러 날짜의 출석 데이터를 한 번에 업로드할 수
                있습니다.
              </p>
              <div className="text-sm text-green-700">
                <p className="font-medium mb-1">CSV 형식:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>member_id 또는 member_name (필수)</li>
                  <li>date: YYYY-MM-DD 형식 (필수)</li>
                  <li>
                    is_available: true/false, 참석/불참, o/x 등 (필수)
                  </li>
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
