'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const LIMIT_OPTIONS = [
    { value: 10, label: '10개씩' },
    { value: 20, label: '20개씩' },
    { value: 50, label: '50개씩' },
];

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface ArrangementPaginationProps {
    meta: PaginationMeta;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
}

export default function ArrangementPagination({
    meta,
    onPageChange,
    onLimitChange,
}: ArrangementPaginationProps) {
    if (meta.totalPages <= 1 && meta.total <= 10) return null;

    return (
        <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-surface)]">
            {/* 좌측: 페이지 정보 + 페이지당 항목 수 */}
            <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                <span>
                    <span className="font-medium text-[var(--color-text-primary)]">{meta.page}</span> / {meta.totalPages} 페이지
                    <span className="mx-2 text-[var(--color-text-tertiary)]">|</span>
                    총 <span className="font-medium text-[var(--color-text-primary)]">{meta.total}</span>개
                </span>

                {/* 페이지당 항목 수 선택 */}
                <Select
                    value={meta.limit.toString()}
                    onValueChange={(value) => onLimitChange(Number(value))}
                >
                    <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LIMIT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 우측: 페이지네이션 버튼 */}
            <div className="flex items-center gap-1 sm:gap-2">
                {/* 첫 페이지 */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(1)}
                    disabled={!meta.hasPrev}
                    title="첫 페이지"
                    className="h-8 w-8"
                >
                    <ChevronsLeft className="h-4 w-4" />
                    <span className="sr-only">첫 페이지</span>
                </Button>

                {/* 이전 페이지 */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(meta.page - 1)}
                    disabled={!meta.hasPrev}
                    title="이전 페이지"
                    className="h-8 w-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">이전 페이지</span>
                </Button>

                {/* 페이지 번호 입력 */}
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min={1}
                        max={meta.totalPages}
                        value={meta.page}
                        onChange={(e) => {
                            const page = Number(e.target.value);
                            if (page >= 1 && page <= meta.totalPages) {
                                onPageChange(page);
                            }
                        }}
                        className="w-14 h-8 text-center"
                    />
                    <span className="text-sm text-[var(--color-text-secondary)]">
                        / {meta.totalPages}
                    </span>
                </div>

                {/* 다음 페이지 */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(meta.page + 1)}
                    disabled={!meta.hasNext}
                    title="다음 페이지"
                    className="h-8 w-8"
                >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">다음 페이지</span>
                </Button>

                {/* 마지막 페이지 */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(meta.totalPages)}
                    disabled={!meta.hasNext}
                    title="마지막 페이지"
                    className="h-8 w-8"
                >
                    <ChevronsRight className="h-4 w-4" />
                    <span className="sr-only">마지막 페이지</span>
                </Button>
            </div>
        </Card>
    );
}
