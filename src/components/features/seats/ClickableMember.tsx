
'use client';

import { CheckCircle2, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useArrangementStore } from '@/store/arrangement-store';
import type { Database } from '@/types/database.types';
import { cn } from '@/lib/utils';

type Part = Database['public']['Enums']['part'];

interface ClickableMemberProps {
    memberId: string;
    name: string;
    part: Part;
    isPlaced?: boolean;
}

export default function ClickableMember({ memberId, name, part, isPlaced }: ClickableMemberProps) {
    const { selectedMemberId, selectedSource, selectMemberFromSidebar } = useArrangementStore();

    // Check if this member is currently selected
    const isSelected = selectedMemberId === memberId && selectedSource === 'sidebar';

    // Part color mapping
    const getPartColor = (p: Part) => {
        switch (p) {
            case 'SOPRANO': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'ALTO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'TENOR': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'BASS': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleClick = () => {
        if (!isPlaced) {
            selectMemberFromSidebar(memberId, name, part);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPlaced}
            className={cn(
                'w-full flex items-center justify-between p-2 mb-1.5 rounded-md shadow-sm min-h-[40px]',
                'transition-all duration-200 touch-manipulation',
                'relative',
                // Normal state
                !isPlaced && !isSelected && 'bg-white border border-gray-200 hover:shadow-md hover:border-primary/50 active:scale-[0.98]',
                // Selected state
                isSelected && 'bg-primary-50 border-2 border-primary-500 ring-2 ring-primary-200',
                // Disabled state
                isPlaced && 'opacity-50 cursor-not-allowed bg-gray-50 border border-gray-200',
            )}
            aria-label={`${name} - ${part} 파트 ${isPlaced ? '(이미 배치됨)' : isSelected ? '(선택됨)' : '클릭하여 선택'}`}
            aria-pressed={isSelected}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {isSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-primary-600 flex-shrink-0 animate-in fade-in zoom-in duration-200" />
                ) : (
                    <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <span className="font-medium text-sm truncate">{name}</span>
            </div>
            <Badge variant="outline" className={`text-[10px] sm:text-xs px-1.5 py-0.5 ${getPartColor(part)} flex-shrink-0 ml-2 w-5 h-5 flex items-center justify-center rounded-full p-0`}>
                {part === 'SPECIAL' ? 'Sp' : part.charAt(0)}
            </Badge>
        </button>
    );
}
