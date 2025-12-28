'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarCheck, Music, UserCheck } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">
                    {title}
                </CardTitle>
                <div className="text-[var(--color-text-tertiary)]">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
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
    // TODO: 실제 데이터 연동
    const stats = [
        {
            title: '총 찬양대원',
            value: '42명',
            description: '지난달 대비 +2명',
            icon: <Users className="h-4 w-4" />,
            trend: { value: '5%', isPositive: true },
        },
        {
            title: '이번 주 출석률',
            value: '85%',
            description: '지난주 82%',
            icon: <UserCheck className="h-4 w-4" />,
            trend: { value: '3%', isPositive: true },
        },
        {
            title: '확정된 배치표',
            value: '12개',
            description: '이번 달 생성됨',
            icon: <CalendarCheck className="h-4 w-4" />,
        },
        {
            title: '연습 곡',
            value: '3곡',
            description: '이번 주 예정',
            icon: <Music className="h-4 w-4" />,
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
}
