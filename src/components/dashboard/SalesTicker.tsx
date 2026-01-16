import React from 'react';
import { DollarSign } from 'lucide-react';

const RECENT_SALES = [
    { id: '1', name: 'Sarah Miller', amount: 5000, team: 'Titãs', time: '2 min atrás' },
    { id: '2', name: 'James Wilson', amount: 3200, team: 'Phoenix', time: '5 min atrás' },
    { id: '3', name: 'Ana Silva', amount: 1500, team: 'Premium', time: '12 min atrás' },
    { id: '4', name: 'Michael Chen', amount: 8000, team: 'Titãs', time: '15 min atrás' },
    { id: '5', name: 'Robert Fox', amount: 2100, team: 'Legacy Global', time: '22 min atrás' },
];

export const SalesTicker: React.FC = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 border-t border-white/10 backdrop-blur-md h-12 flex items-center overflow-hidden z-50">
            <div className="bg-yellow-500 px-6 h-full flex items-center font-bold text-black uppercase tracking-wider text-sm z-10 shadow-lg">
                Últimas Vendas
            </div>

            <div className="flex-1 overflow-hidden relative flex items-center">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-12 px-4">
                    {[...RECENT_SALES, ...RECENT_SALES].map((sale, i) => (
                        <div key={`${sale.id}-${i}`} className="flex items-center gap-3 text-sm">
                            <span className="text-gray-400 font-medium">{sale.time}</span>
                            <span className="font-bold text-white">{sale.name}</span>
                            <span className="text-gray-500 text-xs">({sale.team})</span>
                            <span className="flex items-center text-yellow-500 font-bold">
                                <DollarSign className="w-3 h-3" />
                                {sale.amount.toLocaleString('en-US')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
