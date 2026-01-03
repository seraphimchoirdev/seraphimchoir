
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns/format';
import { addMonths } from 'date-fns/addMonths';
import { ko } from 'date-fns/locale/ko';
import { Loader2, Calendar, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCreateArrangement } from '@/hooks/useArrangements';
import { useServiceSchedules } from '@/hooks/useServiceSchedules';
import type { Database } from '@/types/database.types';

type ServiceSchedule = Database['public']['Tables']['service_schedules']['Row'];

interface CreateArrangementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreateArrangementDialog({
    open,
    onOpenChange,
}: CreateArrangementDialogProps) {
    const router = useRouter();
    const createArrangement = useCreateArrangement();

    // 향후 3개월간의 예배 일정 조회
    const today = new Date();
    const threeMonthsLater = addMonths(today, 3);
    const { data: schedulesResponse, isLoading: isSchedulesLoading } = useServiceSchedules({
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(threeMonthsLater, 'yyyy-MM-dd'),
    });

    // 예배 일정 목록 (날짜순 정렬)
    const upcomingSchedules = useMemo(() => {
        if (!schedulesResponse?.data) return [];
        return [...schedulesResponse.data].sort((a, b) => a.date.localeCompare(b.date));
    }, [schedulesResponse]);

    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        conductor: '',
        serviceInfo: '',
    });
    const [error, setError] = useState<string | null>(null);

    // 예배 일정 선택 시 폼 데이터 자동 채움
    const handleScheduleSelect = (scheduleId: string) => {
        setSelectedScheduleId(scheduleId);
        const schedule = upcomingSchedules.find(s => s.id === scheduleId);
        if (schedule) {
            const dateLabel = format(new Date(schedule.date), 'M월 d일', { locale: ko });
            const defaultTitle = `${dateLabel} ${schedule.service_type || '주일예배'}`;

            // serviceInfo에 찬양곡명과 봉헌송 정보 결합
            const serviceInfoParts: string[] = [];
            if (schedule.hymn_name) serviceInfoParts.push(`찬양곡: ${schedule.hymn_name}`);
            if (schedule.offertory_performer) serviceInfoParts.push(`봉헌송: ${schedule.offertory_performer}`);
            if (schedule.notes) serviceInfoParts.push(schedule.notes);

            setFormData({
                title: defaultTitle,
                date: schedule.date,
                conductor: '',
                serviceInfo: serviceInfoParts.join('\n'),
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedScheduleId) {
            setError('예배 일정을 선택해주세요.');
            return;
        }
        if (!formData.title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }

        createArrangement.mutate(
            {
                title: formData.title,
                date: formData.date,
                conductor: formData.conductor || null,
                service_info: formData.serviceInfo || null,
            },
            {
                onSuccess: (data) => {
                    onOpenChange(false);
                    setSelectedScheduleId('');
                    setFormData({ title: '', date: '', conductor: '', serviceInfo: '' });
                    router.push(`/arrangements/${data.id}`);
                },
                onError: (err) => {
                    setError(err.message);
                },
            }
        );
    };

    // 예배 일정 포맷팅 함수
    const formatScheduleOption = (schedule: ServiceSchedule) => {
        const dateStr = format(new Date(schedule.date), 'M월 d일 (EEE)', { locale: ko });
        const type = schedule.service_type || '주일예배';
        const hymn = schedule.hymn_name ? ` - ${schedule.hymn_name}` : '';
        return `${dateStr} ${type}${hymn}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>새 배치표 만들기</DialogTitle>
                    <DialogDescription>
                        등록된 예배 일정을 선택하여 자리배치표를 생성합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="error">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* 예배 일정 선택 */}
                    <div className="space-y-2">
                        <Label htmlFor="schedule">예배 일정 선택</Label>
                        {isSchedulesLoading ? (
                            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                예배 일정을 불러오는 중...
                            </div>
                        ) : upcomingSchedules.length === 0 ? (
                            <Alert>
                                <Calendar className="h-4 w-4" />
                                <AlertDescription>
                                    등록된 예배 일정이 없습니다.{' '}
                                    <Link
                                        href="/service-schedules"
                                        className="text-[var(--color-primary-600)] hover:underline inline-flex items-center gap-1"
                                    >
                                        예배 일정 관리
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                    에서 먼저 예배 일정을 등록해주세요.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Select value={selectedScheduleId} onValueChange={handleScheduleSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="예배 일정을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {upcomingSchedules.map((schedule) => (
                                        <SelectItem key={schedule.id} value={schedule.id}>
                                            {formatScheduleOption(schedule)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* 선택된 예배 일정이 있을 때만 나머지 필드 표시 */}
                    {selectedScheduleId && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="title">제목</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="예: 1월 1일 주일 2부 예배"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                                <p className="text-xs text-[var(--color-text-tertiary)]">
                                    같은 예배 일정에 여러 배치표가 필요하면 제목으로 구분하세요
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="conductor">지휘자 (선택)</Label>
                                <Input
                                    id="conductor"
                                    name="conductor"
                                    placeholder="지휘자 이름"
                                    value={formData.conductor}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="serviceInfo">예배 정보 / 찬양곡 (선택)</Label>
                                <Textarea
                                    id="serviceInfo"
                                    name="serviceInfo"
                                    placeholder="찬양곡 제목, 봉헌송 정보 등"
                                    className="resize-none"
                                    rows={3}
                                    value={formData.serviceInfo}
                                    onChange={handleChange}
                                />
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            disabled={createArrangement.isPending || !selectedScheduleId}
                        >
                            {createArrangement.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            생성하기
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
