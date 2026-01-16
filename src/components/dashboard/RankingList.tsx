import React, { useEffect, useState } from 'react';
import { Medal, TrendingUp, Siren } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Seller {
    id: string;
    name: string;
    avatar?: string;
    deals: number;
    team?: string;
}

interface RankingListProps {
    sellers: Seller[];
}

const RankItem: React.FC<{ seller: Seller; index: number }> = ({ seller, index }) => {
    const isTop3 = index < 3;
    const hasNoSales = seller.deals === 0;

    return (
        <div className={cn(
            "group flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/10 relative overflow-hidden",
            isTop3 && "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20",
            hasNoSales && "opacity-70 hover:opacity-100"
        )}>
            {/* Rank Position */}
            <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-all duration-300 group-hover:scale-110 shadow-lg",
                index === 0 ? "bg-yellow-500 text-black shadow-yellow-500/20" :
                    index === 1 ? "bg-gray-300 text-black shadow-gray-300/20" :
                        index === 2 ? "bg-amber-700 text-white shadow-amber-700/20" :
                            "bg-white/5 text-gray-400 group-hover:bg-white/10"
            )}>
                {index + 1}
            </div>

            {/* Avatar */}
            <div className="relative">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]",
                    isTop3 ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10" : "border-white/10 text-gray-400 bg-white/5"
                )}>
                    {seller.avatar ? (
                        <img src={seller.avatar} alt={seller.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        seller.name.charAt(0)
                    )}
                </div>
                {index === 0 && (
                    <Medal className="absolute -top-2 -right-2 w-4 h-4 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className={cn(
                        "font-medium truncate transition-colors",
                        isTop3 ? "text-white" : "text-gray-300 group-hover:text-white"
                    )}>
                        {seller.name}
                    </h3>
                    {index === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500 text-black uppercase tracking-wider">
                            Líder
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-sm font-medium text-yellow-500">
                    {hasNoSales ? (
                        <div className="flex items-center justify-end">
                            <Siren className="w-6 h-6 text-red-600 fill-red-600 animate-[pulse_0.5s_ease-in-out_infinite] drop-shadow-[0_0_15px_rgba(220,38,38,1)]" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-end justify-center">
                            <span className="text-2xl font-bold text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                                {seller.deals}
                            </span>
                            <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                                Processos
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const RankingList: React.FC<RankingListProps> = ({ sellers }) => {
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 12; // 15 total slots - 3 top = 12 slots for the rest

    const top3 = sellers.slice(0, 3);
    const rest = sellers.slice(3);

    useEffect(() => {
        if (rest.length <= ITEMS_PER_PAGE) return;

        const interval = setInterval(() => {
            setPage(prev => {
                const nextPage = prev + 1;
                // If next page starts beyond the list, go back to 0
                if (nextPage * ITEMS_PER_PAGE >= rest.length) {
                    return 0;
                }
                return nextPage;
            });
        }, 10000); // 10 seconds

        return () => clearInterval(interval);
    }, [rest.length]);

    const visibleRest = rest.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    // Combine for display: Top 3 (always) + Visible Rest
    // We need to map visibleRest to their ORIGINAL indices for correct ranking numbers
    const displayItems = [
        ...top3.map((s, i) => ({ ...s, originalIndex: i })),
        ...visibleRest.map((s, i) => ({ ...s, originalIndex: 3 + (page * ITEMS_PER_PAGE) + i }))
    ];

    return (
        <div className="bg-[#021029]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-5 h-full flex flex-col shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide uppercase">Ranking Geral</h2>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Top 15
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar relative z-10">
                {displayItems.map((seller) => (
                    <RankItem key={seller.id} seller={seller} index={seller.originalIndex} />
                ))}
            </div>
        </div>
    );
};
