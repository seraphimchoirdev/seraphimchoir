'use client';

import { useState } from 'react';
import { format } from 'date-fns/format';
import { ko } from 'date-fns/locale/ko';
import { Search, X, Calendar, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// 예배 유형 옵션 (ServiceScheduleForm과 동일)
const SERVICE_TYPE_OPTIONS = [
    { value: 'all', label: '전체' },
    { value: '주일2부예배', label: '주일 2부 예배' },
    { value: '주일오후찬양예배', label: '주일 오후 찬양예배' },
    { value: '절기찬양예배', label: '절기 찬양예배' },
    { value: '2부예배', label: '2부 예배' },
    { value: '온세대예배', label: '온세대 예배' },
];

interface ArrangementFiltersProps {
    // 검색
    searchValue: string;
    onSearchChange: (value: string) => void;
    isSearching?: boolean;

    // 날짜 범위
    startDate: Date | undefined;
    endDate: Date | undefined;
    onStartDateChange: (date: Date | undefined) => void;
    onEndDateChange: (date: Date | undefined) => void;

    // 예배 유형
    serviceType: string;
    onServiceTypeChange: (value: string) => void;

    // 전체 초기화
    onReset: () => void;
}

export default function ArrangementFilters({
    searchValue,
    onSearchChange,
    isSearching = false,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    serviceType,
    onServiceTypeChange,
    onReset,
}: ArrangementFiltersProps) {
    const [showFilters, setShowFilters] = useState(false);

    // 활성 필터 개수 계산
    const activeFilterCount = [
        startDate,
        endDate,
        serviceType && serviceType !== 'all',
    ].filter(Boolean).length;

    return (
        <div className="space-y-4">
            {/* 상단 필터 바: 검색 + 필터 토글 */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* 검색창 */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                    </div>
                    <Input
                        type="text"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="찬양곡명, 봉헌송 담당자 검색..."
                        className="pl-10 pr-10"
                    />
                    {searchValue && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            aria-label="검색어 지우기"
                        >
                            <X className="h-4 w-4 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]" />
                        </button>
                    )}
                    {isSearching && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            <Spinner size="sm" />
                        </div>
                    )}
                </div>

                {/* 필터 토글 버튼 */}
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>필터</span>
                    {activeFilterCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)] rounded">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* 확장 필터 패널 */}
            {showFilters && (
                <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border-default)]">
                    <div className="space-y-4">
                        {/* 날짜 범위 필터 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* 시작일 */}
                            <div>
                                <Label className="mb-2 block text-sm font-medium">시작일</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {startDate
                                                ? format(startDate, 'yyyy년 M월 d일', { locale: ko })
                                                : '시작일 선택'
                                            }
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={startDate}
                                            onSelect={(date) => {
                                                if (date instanceof Date || date === undefined) {
                                                    onStartDateChange(date);
                                                }
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* 종료일 */}
                            <div>
                                <Label className="mb-2 block text-sm font-medium">종료일</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {endDate
                                                ? format(endDate, 'yyyy년 M월 d일', { locale: ko })
                                                : '종료일 선택'
                                            }
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={endDate}
                                            onSelect={(date) => {
                                                if (date instanceof Date || date === undefined) {
                                                    onEndDateChange(date);
                                                }
                                            }}
                                            disabled={(date) => startDate ? date < startDate : false}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* 예배 유형 필터 */}
                            <div>
                                <Label className="mb-2 block text-sm font-medium">예배 유형</Label>
                                <Select
                                    value={serviceType || 'all'}
                                    onValueChange={(value) => onServiceTypeChange(value === 'all' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="예배 유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SERVICE_TYPE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* 필터 초기화 버튼 */}
                        <div className="flex justify-end pt-2 border-t border-[var(--color-border-default)]">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onReset}
                                className="gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            >
                                <RotateCcw className="h-4 w-4" />
                                필터 초기화
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
