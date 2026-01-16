import React from 'react';
import { Trophy, Crown, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Winner {
    id: string;
    name: string;
    amount: number;
    avatar?: string;
    position: 1 | 2 | 3;
}



const PodiumStep: React.FC<{ winner: Winner }> = ({ winner }) => {
    const isFirst = winner.position === 1;
    const isSecond = winner.position === 2;

    return (
        <div className={cn(
            "flex flex-col items-center justify-end relative group transition-transform duration-500 hover:scale-105",
            isFirst ? "order-2 -mt-20 z-20" : isSecond ? "order-1 z-10" : "order-3 z-0"
        )}>
            {/* Avatar/Icon */}
            <div className={cn(
                "rounded-full border-4 flex items-center justify-center mb-6 bg-[#021029] relative transition-all duration-500",
                isFirst ? "w-48 h-48 border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.6)]" :
                    isSecond ? "w-36 h-36 border-gray-300 shadow-[0_0_40px_rgba(209,213,219,0.3)]" :
                        "w-32 h-32 border-amber-700 shadow-[0_0_40px_rgba(180,83,9,0.3)]"
            )}>
                {isFirst && (
                    <>
                        <Crown className="absolute -top-20 text-yellow-500 w-20 h-20 animate-bounce drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                        <Sparkles className="absolute -top-16 -right-6 text-yellow-200 w-10 h-10 animate-pulse" />
                        <Sparkles className="absolute -top-6 -left-6 text-yellow-200 w-8 h-8 animate-pulse delay-100" />
                    </>
                )}

                {/* Avatar Image or Placeholder */}
                <div className="w-full h-full rounded-full overflow-hidden relative">
                    <div className={cn(
                        "absolute inset-0 opacity-20",
                        isFirst ? "bg-yellow-500" : isSecond ? "bg-gray-300" : "bg-amber-700"
                    )} />
                    {winner.avatar ? (
                        <img src={winner.avatar} alt={winner.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className={cn(
                            "w-full h-full flex items-center justify-center font-bold",
                            isFirst ? "text-7xl text-yellow-500" : isSecond ? "text-5xl text-gray-300" : "text-4xl text-amber-700"
                        )}>
                            {winner.name.charAt(0)}
                        </span>
                    )}
                </div>

                <div className={cn(
                    "absolute -bottom-5 px-6 py-2 rounded-full text-lg font-black uppercase tracking-wider text-black shadow-xl border-4 border-[#021029]",
                    isFirst ? "bg-yellow-500 scale-110" : isSecond ? "bg-gray-300" : "bg-amber-700 text-white"
                )}>
                    {winner.position}º
                </div>
            </div>

            {/* Name & Value */}
            <div className="text-center mb-6 relative z-20">
                <h3 className={cn(
                    "font-bold text-white mb-1 tracking-tight drop-shadow-md",
                    isFirst ? "text-4xl text-glow-accent" : "text-2xl"
                )}>
                    {winner.name}
                </h3>
                <p className={cn(
                    "font-mono font-medium opacity-80",
                    isFirst ? "text-yellow-400 text-xl" : "text-gray-400 text-lg"
                )}>
                    {winner.amount} Processos
                </p>
            </div>

            {/* Podium Block */}
            <div className={cn(
                "w-full min-w-[220px] rounded-t-3xl backdrop-blur-2xl border-t border-x border-white/10 flex items-end justify-center pb-8 shadow-[0_10px_50px_rgba(0,0,0,0.5)] relative overflow-hidden",
                isFirst ? "h-80 bg-gradient-to-b from-yellow-500/30 via-yellow-500/10 to-transparent" :
                    isSecond ? "h-60 bg-gradient-to-b from-gray-300/30 via-gray-300/10 to-transparent" :
                        "h-48 bg-gradient-to-b from-amber-700/30 via-amber-700/10 to-transparent"
            )}>
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />

                {/* Bottom Reflection/Glow */}
                <div className={cn(
                    "absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-24 blur-3xl opacity-40",
                    isFirst ? "bg-yellow-500" : isSecond ? "bg-gray-300" : "bg-amber-700"
                )} />

                <Trophy className={cn(
                    "w-24 h-24 opacity-40 drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-300",
                    isFirst ? "text-yellow-500" : isSecond ? "text-gray-300" : "text-amber-700"
                )} />
            </div>
        </div>
    );
};

interface PodiumProps {
    winners: Winner[];
}

export const Podium: React.FC<PodiumProps> = ({ winners }) => {
    return (
        <div className="flex justify-center items-end gap-6 px-12 py-8 w-full max-w-6xl mx-auto">
            {winners.sort((a, b) => a.position - b.position).map((winner) => (
                <PodiumStep key={winner.id} winner={winner} />
            ))}
        </div>
    );
};
