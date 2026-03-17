'use client';

import { cn } from '@/lib/utils';
import { useViewMode, getContainerWidthClass } from '@/context/view-mode-context';

export function ViewContainer({ children }: { children: React.ReactNode }) {
    const { viewDevice } = useViewMode();
    const widthClass = getContainerWidthClass(viewDevice);

    return (
        <main className={cn("flex-1", widthClass)}>
            {children}
        </main>
    );
}
