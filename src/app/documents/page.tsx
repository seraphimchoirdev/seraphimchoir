'use client';

import { useState, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import {
  useDocuments,
  useDocumentTags,
  useUploadDocument,
  useDeleteDocument,
  useDocumentDownloadUrl,
  formatFileSize,
} from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  FileText,
  Upload,
  Trash2,
  Download,
  Search,
  X,
  Tag,
  Calendar,
  Plus,
} from 'lucide-react';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'DocumentsPage' });

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

export default function DocumentsPage() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 필터 상태
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // 업로드 폼 상태
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [uploadYear, setUploadYear] = useState(CURRENT_YEAR);
  const [newTag, setNewTag] = useState('');

  // 데이터 조회
  const { data: documents, isLoading } = useDocuments({
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    year: selectedYear,
    search: searchQuery || undefined,
  });
  const { data: allTags } = useDocumentTags();

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  // 권한 확인: 조회는 STAFF까지, 업로드/삭제는 MANAGER까지
  const canView = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'STAFF']);
  const canManage = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);

  if (authLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)] flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </AppShell>
    );
  }

  if (!canView) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Alert variant="error">
              <AlertDescription>
                문서 아카이브에 접근할 권한이 없습니다.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) return;

    try {
      await uploadMutation.mutateAsync({
        file: uploadFile,
        title: uploadTitle,
        description: uploadDescription,
        tags: uploadTags,
        year: uploadYear,
      });

      // 폼 초기화
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadTags([]);
      setUploadYear(CURRENT_YEAR);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      logger.error('업로드 실패:', err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 문서를 삭제하시겠습니까?`)) return;

    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      logger.error('삭제 실패:', err);
    }
  };

  const addTag = () => {
    if (newTag && !uploadTags.includes(newTag)) {
      setUploadTags([...uploadTags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setUploadTags(uploadTags.filter(t => t !== tag));
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-[var(--color-background-tertiary)]">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileText className="h-6 w-6" />
            문서 아카이브
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            회의록, 소식지, 회계자료 등 찬양대 문서를 관리합니다.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            문서 업로드
          </Button>
        )}
      </div>

      {/* 업로드 폼 */}
      {canManage && isUploadOpen && (
        <div className="mb-8 p-6 border border-[var(--color-border)] rounded-lg bg-[var(--color-background-secondary)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">새 문서 업로드</h2>
            <button onClick={() => setIsUploadOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 파일 선택 */}
            <div>
              <label className="block text-sm font-medium mb-2">파일</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
                  }
                }}
                className="w-full"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.csv"
              />
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium mb-2">제목 *</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="문서 제목"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium mb-2">설명</label>
              <Input
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="문서 설명 (선택)"
              />
            </div>

            {/* 연도 */}
            <div>
              <label className="block text-sm font-medium mb-2">연도</label>
              <select
                value={uploadYear}
                onChange={(e) => setUploadYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm font-medium mb-2">태그</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {uploadTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="태그 입력"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  list="tag-suggestions"
                />
                <datalist id="tag-suggestions">
                  {allTags?.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 업로드 버튼 */}
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadTitle || uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  업로드
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* 검색 */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색..."
              className="pl-10"
            />
          </div>
        </div>

        {/* 연도 필터 */}
        <select
          value={selectedYear || ''}
          onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 border border-[var(--color-border)] rounded-md"
        >
          <option value="">전체 연도</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>{year}년</option>
          ))}
        </select>

        {/* 태그 필터 */}
        <div className="flex gap-2 flex-wrap">
          {allTags?.slice(0, 10).map((tag) => (
            <button
              key={tag}
              onClick={() => {
                if (selectedTags.includes(tag)) {
                  setSelectedTags(selectedTags.filter(t => t !== tag));
                } else {
                  setSelectedTags([...selectedTags, tag]);
                }
              }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 문서 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={() => handleDelete(doc.id, doc.title)}
              isDeleting={deleteMutation.isPending}
              canDelete={canManage}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-[var(--color-text-tertiary)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            문서가 없습니다.
          </p>
        </div>
      )}
        </div>
      </div>
    </AppShell>
  );
}

// 문서 카드 컴포넌트
function DocumentCard({
  document: doc,
  onDelete,
  isDeleting,
  canDelete,
}: {
  document: {
    id: string;
    title: string;
    description: string | null;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    tags: string[];
    year: number | null;
    created_at: string;
  };
  onDelete: () => void;
  isDeleting: boolean;
  canDelete: boolean;
}) {
  const { data: downloadUrl } = useDocumentDownloadUrl(doc.file_path);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('image')) return '🖼️';
    return '📁';
  };

  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)] hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getFileIcon(doc.mime_type)}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[var(--color-text-primary)] truncate">
            {doc.title}
          </h3>
          {doc.description && (
            <p className="text-sm text-[var(--color-text-secondary)] truncate mt-1">
              {doc.description}
            </p>
          )}

          {/* 태그 */}
          {doc.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {doc.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)]"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {doc.tags.length > 3 && (
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  +{doc.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* 메타 정보 */}
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {doc.year}년
            </span>
            <span>{formatFileSize(doc.file_size)}</span>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadUrl && window.open(downloadUrl, '_blank')}
          disabled={!downloadUrl}
          className={canDelete ? 'flex-1' : 'w-full'}
        >
          <Download className="h-4 w-4 mr-1" />
          다운로드
        </Button>
        {canDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
