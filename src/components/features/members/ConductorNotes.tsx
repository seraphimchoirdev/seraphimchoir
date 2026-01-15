'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ConductorNotesProps {
  memberId: string;
  memberName: string;
  userRole?: string | null;
}

/**
 * 지휘자 전용 메모 컴포넌트
 * 오직 CONDUCTOR만 볼 수 있는 암호화된 메모 입력/편집 폼
 *
 * 특징:
 * - 오직 CONDUCTOR만 접근 가능 (ADMIN 포함 다른 역할 접근 불가)
 * - 메모는 서버에서 AES-256-GCM 암호화되어 저장됨
 * - ADMIN도 API 및 DB에서 직접 확인 불가능
 */
export function ConductorNotes({ memberId, memberName, userRole }: ConductorNotesProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 오직 CONDUCTOR만 접근 가능 (userRole이 없으면 렌더링하지 않음)
  const shouldRender = userRole === 'CONDUCTOR';

  // 메모 로드 (CONDUCTOR만 실행)
  useEffect(() => {
    // CONDUCTOR가 아니면 API 호출하지 않음
    if (userRole !== 'CONDUCTOR') {
      setIsLoading(false);
      return;
    }

    async function loadNotes() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/members/${memberId}/conductor-notes`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('지휘자 권한이 필요합니다.');
          }
          const errorData = await response.json();
          throw new Error(errorData.error || '메모를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setNotes(data.notes || '');
        setOriginalNotes(data.notes || '');
      } catch (err) {
        console.error('메모 로드 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadNotes();
  }, [memberId, userRole]);

  // 메모 저장
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/members/${memberId}/conductor-notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '메모를 저장하는데 실패했습니다.');
      }

      const data = await response.json();
      setOriginalNotes(notes);
      setSuccessMessage(data.message || '메모가 저장되었습니다.');
      setIsEditing(false);

      // 성공 메시지 3초 후 자동 제거
      setTimeout(() => setSuccessMessage(null), 3000);

      // 페이지 새로고침 (필요시)
      router.refresh();
    } catch (err) {
      console.error('메모 저장 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 메모 삭제
  const handleDelete = async () => {
    if (!confirm('정말 이 메모를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/members/${memberId}/conductor-notes`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '메모를 삭제하는데 실패했습니다.');
      }

      const data = await response.json();
      setNotes('');
      setOriginalNotes('');
      setSuccessMessage(data.message || '메모가 삭제되었습니다.');
      setIsEditing(false);

      // 성공 메시지 3초 후 자동 제거
      setTimeout(() => setSuccessMessage(null), 3000);

      router.refresh();
    } catch (err) {
      console.error('메모 삭제 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 편집 취소
  const handleCancel = () => {
    setNotes(originalNotes);
    setIsEditing(false);
    setError(null);
  };

  // CONDUCTOR 권한이 없으면 렌더링하지 않음
  if (!shouldRender) {
    return null;
  }

  return (
    <div className="border border-amber-300 bg-amber-50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          지휘자 전용 메모 (암호화됨)
        </h3>
        <span className="text-xs text-amber-700 bg-amber-200 px-2 py-1 rounded">
          {userRole}만 접근 가능
        </span>
      </div>

      <p className="text-sm text-amber-700 mb-4">
        {memberName}에 대한 민감한 정보를 암호화하여 저장합니다. ADMIN도 DB에서 직접 확인할 수 없습니다.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          <div className="mb-4">
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (!isEditing) setIsEditing(true);
              }}
              placeholder="지휘자 전용 메모를 입력하세요..."
              className="w-full h-32 px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              disabled={isSaving}
            />
          </div>

          <div className="flex gap-2 justify-end">
            {isEditing && (
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-md hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
            )}

            {notes && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '삭제 중...' : '삭제'}
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || !isEditing}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ConductorNotes;
