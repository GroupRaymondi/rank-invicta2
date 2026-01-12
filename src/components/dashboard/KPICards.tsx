import React from 'react';


interface KPICardsProps {
    totalProcesses: number;
}

export const KPICards: React.FC<KPICardsProps> = ({ totalProcesses }) => {
    return (
        <div className="flex justify-center mb-8 px-6">
            <div className="relative group hover:scale-105 transition-transform duration-500 w-full max-w-md text-center">
                {/* Subtle glow behind the number */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -z-10 group-hover:bg-yellow-500/20 transition-colors duration-500" />

                <div className="relative z-10 flex flex-col items-center">
                    <p className="text-gray-400 font-medium uppercase tracking-widest mb-1 text-sm">Total de Processos</p>
                    <h3 className="text-7xl font-black text-yellow-500 tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                        {totalProcesses}
                    </h3>
                </div>
            </div>
        </div>
    );
};
