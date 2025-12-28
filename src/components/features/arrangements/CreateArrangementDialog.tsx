
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

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
import { useCreateArrangement } from '@/hooks/useArrangements';

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

    const [formData, setFormData] = useState({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        conductor: '',
        serviceInfo: '',
    });
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }
        if (!formData.date) {
            setError('날짜를 선택해주세요.');
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
                    router.push(`/arrangements/${data.id}`);
                },
                onError: (err) => {
                    setError(err.message);
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>새 배치표 만들기</DialogTitle>
                    <DialogDescription>
                        새로운 찬양대 자리배치표를 생성합니다. 같은 날짜에 여러 예배(주일 대예배, 주일 오후 찬양예배 등)를 위한 배치표를 만들 수 있습니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="error">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="date">날짜</Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">제목</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="예: 1월 1일 주일 2부 예배, 주일 오후 찬양예배"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                            같은 날짜에 여러 예배가 있다면 제목으로 구분해주세요
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
                            value={formData.serviceInfo}
                            onChange={handleChange}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            취소
                        </Button>
                        <Button type="submit" disabled={createArrangement.isPending}>
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
