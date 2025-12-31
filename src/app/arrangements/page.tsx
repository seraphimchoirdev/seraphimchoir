
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navigation from '@/components/layout/Navigation';
import ArrangementList from '@/components/features/arrangements/ArrangementList';
import CreateArrangementDialog from '@/components/features/arrangements/CreateArrangementDialog';
import { useArrangements } from '@/hooks/useArrangements';

export default function ArrangementsPage() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const { data, isLoading, error } = useArrangements({ limit: 100 });

    return (
        <div className="min-h-screen bg-[var(--color-background-tertiary)]">
            <Navigation />

            <div className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="heading-2 text-[var(--color-text-primary)]">자리배치 관리</h1>
                            <p className="text-[var(--color-text-secondary)] mt-1">
                                찬양대 자리배치표를 생성하고 관리합니다.
                            </p>
                        </div>
                        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            새 배치표 만들기
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <Spinner size="lg" />
                        </div>
                    )}

                    {error && (
                        <Alert variant="error">
                            <AlertDescription>
                                {error.message || '배치표 목록을 불러오는데 실패했습니다.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {!isLoading && !error && data && (
                        <ArrangementList arrangements={data.data} />
                    )}

                    <CreateArrangementDialog
                        open={isCreateDialogOpen}
                        onOpenChange={setIsCreateDialogOpen}
                    />
                </div>
            </div>
        </div>
    );
}
