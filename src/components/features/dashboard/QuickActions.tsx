'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    UserPlus,
    CalendarDays,
    LayoutGrid,
    // TODO: 페이지 구현 후 활성화
    // FileText,
    // Settings,
    // MessageCircle,
} from 'lucide-react';

export default function QuickActions() {
    const actions = [
        {
            label: '대원 등록',
            href: '/management/members/new',
            icon: <UserPlus className="h-4 w-4" />,
            variant: 'default' as const,
        },
        {
            label: '출석 체크',
            href: '/attendances',
            icon: <CalendarDays className="h-4 w-4" />,
            variant: 'outline' as const,
        },
        {
            label: '새 배치 만들기',
            href: '/arrangements/new',
            icon: <LayoutGrid className="h-4 w-4" />,
            variant: 'outline' as const,
        },
        // TODO: 아래 기능들은 페이지 구현 후 활성화
        // {
        //     label: '지휘자 메모',
        //     href: '/conductor-notes',
        //     icon: <FileText className="h-4 w-4" />,
        //     variant: 'ghost' as const,
        // },
        // {
        //     label: '카카오톡 공유',
        //     href: '#',
        //     icon: <MessageCircle className="h-4 w-4" />,
        //     variant: 'ghost' as const,
        // },
        // {
        //     label: '설정',
        //     href: '/settings',
        //     icon: <Settings className="h-4 w-4" />,
        //     variant: 'ghost' as const,
        // },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {actions.map((action, index) => (
                <Button
                    key={index}
                    variant={action.variant}
                    className="h-auto py-4 flex flex-col gap-2 items-center justify-center"
                    asChild
                >
                    <Link href={action.href}>
                        {action.icon}
                        <span>{action.label}</span>
                    </Link>
                </Button>
            ))}
        </div>
    );
}
