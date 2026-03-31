'use client';

import { Check, Search, Users } from 'lucide-react';

import { memo, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import {
  useAddArrangementGuests,
  useArrangementGuests,
  useRemoveArrangementGuest,
} from '@/hooks/useArrangementGuests';
import { useMembers } from '@/hooks/useMembers';

import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/lib/toast';

import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];

const PART_LABELS: Record<Part, string> = {
  SOPRANO: 'S',
  ALTO: 'A',
  TENOR: 'T',
  BASS: 'B',
  SPECIAL: 'Sp',
};

const PART_COLORS: Record<Part, string> = {
  SOPRANO: 'bg-[var(--color-part-soprano-200)] text-[var(--color-part-soprano-700)]',
  ALTO: 'bg-[var(--color-part-alto-200)] text-[var(--color-part-alto-700)]',
  TENOR: 'bg-[var(--color-part-tenor-200)] text-[var(--color-part-tenor-700)]',
  BASS: 'bg-[var(--color-part-bass-200)] text-[var(--color-part-bass-700)]',
  SPECIAL: 'bg-[var(--color-part-special-200)] text-[var(--color-part-special-700)]',
};

interface GuestManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrangementId: string;
}

const GuestManageDialog = memo(function GuestManageDialog({
  open,
  onOpenChange,
  arrangementId,
}: GuestManageDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 게스트 상태 멤버 전체 조회
  const { data: guestMembersData, isLoading: membersLoading } = useMembers({
    member_status: 'GUEST',
    limit: 100,
  });

  // 이미 이 배치표에 연결된 게스트
  const { data: linkedGuests, isLoading: linkedLoading } = useArrangementGuests(arrangementId);

  const addGuests = useAddArrangementGuests();
  const removeGuest = useRemoveArrangementGuest();

  const allGuests = useMemo(() => guestMembersData?.data || [], [guestMembersData?.data]);

  const linkedGuestIds = useMemo(
    () => new Set(linkedGuests?.map((g) => g.member_id) || []),
    [linkedGuests]
  );

  const filteredGuests = useMemo(
    () =>
      allGuests.filter((g) => {
        if (searchTerm && !g.name.includes(searchTerm)) return false;
        return true;
      }),
    [allGuests, searchTerm]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    // 아직 연결되지 않은 선택 항목만
    const toAdd = [...selectedIds].filter((id) => !linkedGuestIds.has(id));
    if (toAdd.length === 0) return;

    try {
      await addGuests.mutateAsync({ arrangementId, memberIds: toAdd });
      showSuccess(`게스트 ${toAdd.length}명이 연결되었습니다.`);
      setSelectedIds(new Set());
    } catch {
      showError('게스트 연결에 실패했습니다.');
    }
  };

  const handleRemoveGuest = async (memberId: string) => {
    try {
      await removeGuest.mutateAsync({ arrangementId, memberId });
      showSuccess('게스트 연결이 해제되었습니다.');
    } catch {
      showError('연결 해제에 실패했습니다.');
    }
  };

  const isLoading = membersLoading || linkedLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            게스트 관리
          </DialogTitle>
          <DialogDescription>
            이 배치표에 참여할 게스트를 선택하세요. 대원 관리에서 게스트를 먼저 등록해야 합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 이미 연결된 게스트 */}
        {linkedGuests && linkedGuests.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-[var(--color-text-secondary)]">
              연결된 게스트 ({linkedGuests.length}명)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {linkedGuests.map((g) =>
                g.members ? (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleRemoveGuest(g.member_id)}
                    className="group flex items-center gap-1 rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-2 py-1 text-sm transition-colors hover:border-red-300 hover:bg-red-50"
                    title="클릭하여 연결 해제"
                  >
                    <span>{g.members.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'px-1 py-0 text-[9px]',
                        PART_COLORS[g.members.part as Part]
                      )}
                    >
                      {PART_LABELS[g.members.part as Part]}
                    </Badge>
                    <span className="hidden text-[10px] text-red-500 group-hover:inline">✕</span>
                  </button>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <Input
            placeholder="게스트 이름 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 게스트 목록 */}
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
              로딩 중...
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
              {allGuests.length === 0
                ? '등록된 게스트가 없습니다. 대원 관리에서 게스트를 먼저 등록해주세요.'
                : '검색 결과가 없습니다.'}
            </div>
          ) : (
            filteredGuests.map((guest) => {
              const isLinked = linkedGuestIds.has(guest.id);
              const isSelected = selectedIds.has(guest.id);

              return (
                <button
                  key={guest.id}
                  type="button"
                  onClick={() => !isLinked && toggleSelect(guest.id)}
                  disabled={isLinked}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                    isLinked
                      ? 'cursor-default bg-neutral-50 text-neutral-400'
                      : isSelected
                        ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                        : 'hover:bg-[var(--color-background-secondary)]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{guest.name}</span>
                    <Badge
                      variant="outline"
                      className={cn('px-1 py-0 text-[9px]', PART_COLORS[guest.part])}
                    >
                      {PART_LABELS[guest.part]}
                    </Badge>
                    {isLinked && (
                      <span className="text-[10px] text-neutral-400">연결됨</span>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[var(--color-primary-600)]" />}
                  {isLinked && <Check className="h-4 w-4 text-neutral-300" />}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          {selectedIds.size > 0 && (
            <Button
              onClick={handleAddSelected}
              disabled={addGuests.isPending}
            >
              {addGuests.isPending ? '연결 중...' : `${selectedIds.size}명 연결`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default GuestManageDialog;
