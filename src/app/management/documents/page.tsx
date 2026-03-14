'use client';

import {
  Calendar,
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/hooks/useAuth';
import {
  formatFileSize,
  useDeleteDocument,
  useDocumentDownloadUrl,
  useDocumentTags,
  useDocuments,
  useUploadDocument,
} from '@/hooks/useDocuments';

import { createLogger } from '@/lib/logger';

const logger = createLogger({ prefix: 'ManagementDocumentsPage' });

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

export default function ManagementDocumentsPage() {
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

  // 삭제 확인 다이얼로그
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
    title: string;
  }>({
    open: false,
    id: null,
    title: '',
  });

  // 데이터 조회
  const { data: documents, isLoading } = useDocuments({
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    year: selectedYear,
    search: searchQuery || undefined,
  });
  const { data: allTags } = useDocumentTags();

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  // 권한 확인: 조회는 SECRETARY/TREASURER까지, 업로드/삭제는 MANAGER까지
  const canView = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER', 'SECRETARY', 'TREASURER']);
  const canManage = hasRole(['ADMIN', 'CONDUCTOR', 'MANAGER']);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert variant="error">
          <AlertDescription>문서 아카이브에 접근할 권한이 없습니다.</AlertDescription>
        </Alert>
      </div>
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

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteDialog({ open: true, id, title });
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      await deleteMutation.mutateAsync(deleteDialog.id);
    } catch (err) {
      logger.error('삭제 실패:', err);
    } finally {
      setDeleteDialog({ open: false, id: null, title: '' });
    }
  };

  const addTag = () => {
    if (newTag && !uploadTags.includes(newTag)) {
      setUploadTags([...uploadTags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setUploadTags(uploadTags.filter((t) => t !== tag));
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
            <FileText className="h-6 w-6" />
            문서 아카이브
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            회의록, 소식지, 회계자료 등 찬양대 문서를 관리합니다.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            문서 업로드
          </Button>
        )}
      </div>

      {/* 업로드 폼 */}
      {canManage && isUploadOpen && (
        <div className="mb-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">새 문서 업로드</h2>
            <button onClick={() => setIsUploadOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 파일 선택 */}
            <div>
              <label className="mb-2 block text-sm font-medium">파일</label>
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
              <label className="mb-2 block text-sm font-medium">제목 *</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="문서 제목"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="mb-2 block text-sm font-medium">설명</label>
              <Input
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="문서 설명 (선택)"
              />
            </div>

            {/* 연도 */}
            <div>
              <label className="mb-2 block text-sm font-medium">연도</label>
              <select
                value={uploadYear}
                onChange={(e) => setUploadYear(Number(e.target.value))}
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </div>

            {/* 태그 */}
            <div>
              <label className="mb-2 block text-sm font-medium">태그</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {uploadTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-light)] px-2 py-1 text-sm text-[var(--color-primary)]"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
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
        <div className="min-w-[200px] flex-1">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
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
          className="rounded-md border border-[var(--color-border)] px-3 py-2"
        >
          <option value="">전체 연도</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>

        {/* 태그 필터 */}
        <div className="flex flex-wrap gap-2">
          {allTags?.slice(0, 10).map((tag) => (
            <button
              key={tag}
              onClick={() => {
                if (selectedTags.includes(tag)) {
                  setSelectedTags(selectedTags.filter((t) => t !== tag));
                } else {
                  setSelectedTags([...selectedTags, tag]);
                }
              }}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
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
              onDelete={() => handleDeleteClick(doc.id, doc.title)}
              isDeleting={deleteMutation.isPending}
              canDelete={canManage}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
          <p className="text-[var(--color-text-secondary)]">문서가 없습니다.</p>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            id: open ? deleteDialog.id : null,
            title: open ? deleteDialog.title : '',
          })
        }
        title="문서 삭제"
        description={`"${deleteDialog.title}" 문서를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
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
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-secondary)] p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getFileIcon(doc.mime_type)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-[var(--color-text-primary)]">{doc.title}</h3>
          {doc.description && (
            <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
              {doc.description}
            </p>
          )}

          {/* 태그 */}
          {doc.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {doc.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
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
          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {doc.year}년
            </span>
            <span>{formatFileSize(doc.file_size)}</span>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadUrl && window.open(downloadUrl, '_blank')}
          disabled={!downloadUrl}
          className={canDelete ? 'flex-1' : 'w-full'}
        >
          <Download className="mr-1 h-4 w-4" />
          다운로드
        </Button>
        {canDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
