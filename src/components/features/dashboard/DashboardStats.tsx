'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarCheck, Music, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ReactNode;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    loading?: boolean;
}

function StatCard({ title, value, description, icon, trend, loading }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">
                    {title}
                </CardTitle>
                <div className="text-[var(--color-text-tertiary)]">{icon}</div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-20 mb-1" />
                ) : (
                    <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
                )}
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {description}
                    {trend && (
                        <span className={`ml-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '↑' : '↓'} {trend.value}
                        </span>
                    )}
                </p>
            </CardContent>
        </Card>
    );
}

export default function DashboardStats() {
    const [stats, setStats] = useState({
        totalMembers: 0,
        attendanceRate: 0,
        arrangementsCount: 0,
        practiceSongsCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/dashboard/stats');
                if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error(err);
                setError('데이터 로딩 실패');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const statItems = [
        {
            title: '총 찬양대원',
            value: `${stats.totalMembers}명`,
            description: '현재 활동 중인 대원',
            icon: <Users className="h-4 w-4" />,
            // trend: { value: '5%', isPositive: true }, // 추후 구현
        },
        {
            title: '이번 주 출석률',
            value: `${stats.attendanceRate}%`,
            description: '지난주 대비 변동 확인 필요',
            icon: <UserCheck className="h-4 w-4" />,
            // trend: { value: '3%', isPositive: true },
        },
        {
            title: '확정된 배치표',
            value: `${stats.arrangementsCount}개`,
            description: '이번 달 생성됨',
            icon: <CalendarCheck className="h-4 w-4" />,
        },
        {
            title: '연습/예배 곡',
            value: `${stats.practiceSongsCount}곡`,
            description: '이번 주 예정',
            icon: <Music className="h-4 w-4" />,
        },
    ];

    if (error) {
        return <div className="text-red-500 text-sm p-4">통계 정보를 불러올 수 없습니다.</div>;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statItems.map((stat, index) => (
                <StatCard key={index} {...stat} loading={loading} />
            ))}
        </div>
    );
}
