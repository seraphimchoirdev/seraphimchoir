'use client';

import { X, Check, SlidersHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { Database } from '@/types/database.types';

type Part = Database['public']['Enums']['part'];
type MemberStatus = Database['public']['Enums']['member_status'];

interface MemberTableToolbarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedPart: Part | 'ALL';
    onPartChange: (value: Part | 'ALL') => void;
    selectedStatus: MemberStatus | 'ALL';
    onStatusChange: (value: MemberStatus | 'ALL') => void;
    onReset: () => void;
    sortBy: string;
    onSortChange: (value: any) => void;
    sortOrder: 'asc' | 'desc';
    onSortOrderChange: (value: 'asc' | 'desc') => void;
}

const PARTS: { value: Part; label: string }[] = [
    { value: 'SOPRANO', label: '소프라노' },
    { value: 'ALTO', label: '알토' },
    { value: 'TENOR', label: '테너' },
    { value: 'BASS', label: '베이스' },
];

const MEMBER_STATUSES: { value: MemberStatus; label: string }[] = [
    { value: 'NEW', label: '신입대원' },
    { value: 'REGULAR', label: '정대원' },
    { value: 'ON_LEAVE', label: '휴직대원' },
    { value: 'RESIGNED', label: '사직대원' },
];

export function MemberTableToolbar({
    searchTerm,
    onSearchChange,
    selectedPart,
    onPartChange,
    selectedStatus,
    onStatusChange,
    onReset,
    sortBy,
    onSortChange,
    sortOrder,
    onSortOrderChange,
}: MemberTableToolbarProps) {
    const isFiltered = searchTerm !== '' || selectedPart !== 'ALL' || selectedStatus !== 'ALL';

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center space-x-2">
                <Input
                    placeholder="이름 검색..."
                    value={searchTerm}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="h-8 w-[150px] lg:w-[250px]"
                />

                <div className="flex gap-2">
                    {/* 파트 필터 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-dashed">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                파트
                                {selectedPart !== 'ALL' && (
                                    <>
                                        <div className="mx-2 h-4 w-[1px] bg-[var(--color-border-default)]" />
                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                            {PARTS.find(p => p.value === selectedPart)?.label}
                                        </Badge>
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <div className="px-2 py-1.5 text-sm font-semibold">파트 선택</div>
                            <DropdownMenuSeparator />
                            <div>
                                <DropdownMenuItem
                                    onClick={() => onPartChange('ALL')}
                                    className="justify-between"
                                >
                                    전체
                                    {selectedPart === 'ALL' && <Check className="h-4 w-4" />}
                                </DropdownMenuItem>
                                {PARTS.map((part) => (
                                    <DropdownMenuItem
                                        key={part.value}
                                        onClick={() => onPartChange(part.value)}
                                        className="justify-between"
                                    >
                                        {part.label}
                                        {selectedPart === part.value && <Check className="h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 상태 필터 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-dashed">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                상태
                                {selectedStatus !== 'ALL' && (
                                    <>
                                        <div className="mx-2 h-4 w-[1px] bg-[var(--color-border-default)]" />
                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                            {MEMBER_STATUSES.find(s => s.value === selectedStatus)?.label}
                                        </Badge>
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <div className="px-2 py-1.5 text-sm font-semibold">대원 상태</div>
                            <DropdownMenuSeparator />
                            <div>
                                <DropdownMenuItem
                                    onClick={() => onStatusChange('ALL')}
                                    className="justify-between"
                                >
                                    전체
                                    {selectedStatus === 'ALL' && <Check className="h-4 w-4" />}
                                </DropdownMenuItem>
                                {MEMBER_STATUSES.map((status) => (
                                    <DropdownMenuItem
                                        key={status.value}
                                        onClick={() => onStatusChange(status.value)}
                                        className="justify-between"
                                    >
                                        {status.label}
                                        {selectedStatus === status.value && <Check className="h-4 w-4" />}
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={onReset}
                        className="h-8 px-2 lg:px-3"
                    >
                        초기화
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
