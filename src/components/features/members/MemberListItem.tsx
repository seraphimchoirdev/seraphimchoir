'use client';

import Link from 'next/link';
import { useDeleteMember } from '@/hooks/useMembers';
import type { Database } from '@/types/database.types';
import { useState } from 'react';
import MemberAvatar from './MemberAvatar';
import { MoreVertical, Edit2, Trash2, Eye } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type Member = Database['public']['Tables']['members']['Row'];
type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

interface MemberListItemProps {
    member: Member;
    onDelete?: () => void;
}

// 파트별 색상 (악보 스티커 색상 기준 - 자리배치와 통일)
const PART_COLORS: Partial<Record<Part, string>> = {
    SOPRANO: 'text-[var(--color-part-soprano-600)] bg-[var(--color-part-soprano-50)] border-[var(--color-part-soprano-200)]',
    ALTO: 'text-[var(--color-part-alto-600)] bg-[var(--color-part-alto-50)] border-[var(--color-part-alto-200)]',
    TENOR: 'text-[var(--color-part-tenor-600)] bg-[var(--color-part-tenor-50)] border-[var(--color-part-tenor-200)]',
    BASS: 'text-[var(--color-part-bass-600)] bg-[var(--color-part-bass-50)] border-[var(--color-part-bass-200)]',
    SPECIAL: 'text-[var(--color-part-special-600)] bg-[var(--color-part-special-50)] border-[var(--color-part-special-200)]',
};

// 파트명 한글
const PART_LABELS: Partial<Record<Part, string>> = {
    SOPRANO: '소프라노',
    ALTO: '알토',
    TENOR: '테너',
    BASS: '베이스',
};

// 상태명 한글
const STATUS_LABELS: Record<MemberStatus, string> = {
    REGULAR: '정대원',
    NEW: '신입대원',
    ON_LEAVE: '휴직대원',
    RESIGNED: '사직대원',
};

export default function MemberListItem({ member, onDelete }: MemberListItemProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const deleteMutation = useDeleteMember();

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(member.id);
            onDelete?.();
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    return (
        <>
            <div className="bg-[var(--color-background-primary)] border border-[var(--color-border-default)] rounded-lg p-3 flex items-center justify-between hover:bg-[var(--color-background-secondary)] transition-colors">
                <Link href={`/members/${member.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <MemberAvatar name={member.name} part={member.part} size="sm" />

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--color-text-primary)] truncate">{member.name}</span>
                            {member.is_leader && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded">
                                    리더
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                            <span className={`px-1.5 py-0.5 rounded border ${PART_COLORS[member.part]}`}>
                                {PART_LABELS[member.part]}
                            </span>
                            <span>{STATUS_LABELS[member.member_status]}</span>
                        </div>
                    </div>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">메뉴 열기</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/members/${member.id}`} className="flex items-center gap-2 cursor-pointer">
                                <Eye className="h-4 w-4" />
                                <span>상세보기</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/members/${member.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                                <Edit2 className="h-4 w-4" />
                                <span>수정</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>삭제</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* 삭제 확인 모달 */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-background-primary)] rounded-lg p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">찬양대원 삭제</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                            <strong>{member.name}</strong> 님을 삭제하시겠습니까?
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleteMutation.isPending}
                            >
                                취소
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
