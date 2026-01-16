import React from 'react';
import { cn } from '../../lib/utils';

interface DashboardLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, className }) => {
    return (
        <div className={cn("min-h-screen bg-background text-white p-6 flex flex-col gap-6 relative", className)}>
            {/* Background Glow Effect */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 opacity-50" />

            {children}
        </div>
    );
};
