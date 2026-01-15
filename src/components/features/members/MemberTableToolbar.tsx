'use client';

import { X, Check, PlusCircle, ArrowUpDown, Clock } from 'lucide-react';
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
import type { SortByField, SortOrder } from '@/types/api';

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
    sortBy: SortByField;
    onSortChange: (value: SortByField) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (value: SortOrder) => void;
    // 장기 미출석 필터
    absentDaysService?: number;
    onAbsentDaysServiceChange: (value: number | undefined) => void;
    absentDaysPractice?: number;
    onAbsentDaysPracticeChange: (value: number | undefined) => void;
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

// 정렬 기준 옵션
const SORT_OPTIONS: { value: SortByField; label: string }[] = [
    { value: 'name', label: '이름순' },
    { value: 'part', label: '파트순' },
    { value: 'createdAt', label: '등록일순' },
    { value: 'lastServiceDate', label: '최근 등단일순' },
    { value: 'lastPracticeDate', label: '최근 연습일순' },
];

// 장기 미출석 기간 옵션
const ABSENT_PERIOD_OPTIONS: { value: number; label: string }[] = [
    { value: 30, label: '1개월 이상' },
    { value: 60, label: '2개월 이상' },
    { value: 90, label: '3개월 이상' },
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
    absentDaysService,
    onAbsentDaysServiceChange,
    absentDaysPractice,
    onAbsentDaysPracticeChange,
}: MemberTableToolbarProps) {
    const isFiltered =
        searchTerm !== '' ||
        selectedPart !== 'ALL' ||
        selectedStatus !== 'ALL' ||
        absentDaysService !== undefined ||
        absentDaysPractice !== undefined ||
        sortBy !== 'createdAt' ||
        sortOrder !== 'desc';

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

                    {/* 정렬 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-dashed">
                                <ArrowUpDown className="mr-2 h-4 w-4" />
                                정렬
                                {(sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                                    <>
                                        <div className="mx-2 h-4 w-[1px] bg-[var(--color-border-default)]" />
                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                            {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
                                            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                                        </Badge>
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <div className="px-2 py-1.5 text-sm font-semibold">정렬 기준</div>
                            <DropdownMenuSeparator />
                            {SORT_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => onSortChange(option.value)}
                                    className="justify-between"
                                >
                                    {option.label}
                                    {sortBy === option.value && <Check className="h-4 w-4" />}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-sm font-semibold">정렬 순서</div>
                            <DropdownMenuItem
                                onClick={() => onSortOrderChange('asc')}
                                className="justify-between"
                            >
                                오름차순
                                {sortOrder === 'asc' && <Check className="h-4 w-4" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onSortOrderChange('desc')}
                                className="justify-between"
                            >
                                내림차순
                                {sortOrder === 'desc' && <Check className="h-4 w-4" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 장기 미출석 필터 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-dashed">
                                <Clock className="mr-2 h-4 w-4" />
                                미출석
                                {(absentDaysService || absentDaysPractice) && (
                                    <>
                                        <div className="mx-2 h-4 w-[1px] bg-[var(--color-border-default)]" />
                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal text-[var(--color-warning-700)]">
                                            {absentDaysService
                                                ? `등단 ${Math.floor(absentDaysService / 30)}개월+`
                                                : `연습 ${Math.floor((absentDaysPractice || 0) / 30)}개월+`}
                                        </Badge>
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[220px]">
                            <div className="px-2 py-1.5 text-sm font-semibold">등단 미출석 기간</div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    onAbsentDaysServiceChange(undefined);
                                }}
                                className="justify-between"
                            >
                                전체
                                {!absentDaysService && !absentDaysPractice && <Check className="h-4 w-4" />}
                            </DropdownMenuItem>
                            {ABSENT_PERIOD_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={`service-${option.value}`}
                                    onClick={() => {
                                        onAbsentDaysServiceChange(option.value);
                                        onAbsentDaysPracticeChange(undefined);
                                    }}
                                    className="justify-between"
                                >
                                    {option.label}
                                    {absentDaysService === option.value && <Check className="h-4 w-4" />}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-sm font-semibold">연습 미출석 기간</div>
                            <DropdownMenuSeparator />
                            {ABSENT_PERIOD_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={`practice-${option.value}`}
                                    onClick={() => {
                                        onAbsentDaysPracticeChange(option.value);
                                        onAbsentDaysServiceChange(undefined);
                                    }}
                                    className="justify-between"
                                >
                                    {option.label}
                                    {absentDaysPractice === option.value && <Check className="h-4 w-4" />}
                                </DropdownMenuItem>
                            ))}
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
