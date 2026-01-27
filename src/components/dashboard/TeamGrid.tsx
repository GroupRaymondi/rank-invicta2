import React from 'react';
import { Users, Trophy, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Team {
    id: string;
    name: string;
    amount: number;
    members: number;
    rank: number;
    processes: number;
    topMembers: { name: string; processes: number }[];
}

const TeamCard: React.FC<{ team: Team }> = ({ team }) => (
    <div className={cn(
        "relative overflow-hidden rounded-xl p-3 transition-all duration-300 group border flex flex-col justify-center min-h-[72px]", // Increased height and padding
        team.rank === 1 ? "bg-gradient-to-r from-yellow-500/20 to-black/60 border-yellow-500/30" :
            team.rank === 2 ? "bg-gradient-to-r from-gray-300/20 to-black/60 border-gray-300/30" :
                team.rank === 3 ? "bg-gradient-to-r from-amber-700/20 to-black/60 border-amber-700/30" :
                    "bg-white/5 border-white/5 hover:bg-white/10"
    )}>
        <div className="flex items-center justify-between gap-3">
            {/* Left: Rank & Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                    "w-8 h-8 flex-none flex items-center justify-center rounded-lg font-bold text-sm shadow-lg", // Increased size
                    team.rank === 1 ? "bg-yellow-500 text-black" :
                        team.rank === 2 ? "bg-gray-300 text-black" :
                            team.rank === 3 ? "bg-amber-700 text-white" :
                                "bg-white/10 text-gray-400"
                )}>
                    {team.rank}º
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between">
                        <h3 className={cn(
                            "text-sm font-bold truncate tracking-wide uppercase", // Increased font
                            team.rank <= 3 ? "text-white" : "text-gray-300"
                        )}>
                            {team.name}
                        </h3>
                        <div className="flex items-center gap-1 text-yellow-500">
                            <Target className="w-4 h-4" />
                            <span className="font-bold text-base">{team.processes}</span> {/* Increased font */}
                        </div>
                    </div>

                    {/* Member Count (Subtle) */}
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                        <Users className="w-3 h-3" />
                        <span>{team.members} {team.members === 1 ? 'membro' : 'membros'}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/30 rounded-full h-1.5 mt-1.5 overflow-hidden border border-white/5">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden",
                                team.rank === 1 ? "bg-yellow-500" :
                                    team.rank === 2 ? "bg-gray-300" :
                                        team.rank === 3 ? "bg-amber-700" :
                                            "bg-yellow-500/70"
                            )}
                            style={{ width: `${Math.min((team.processes / 50) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

interface TeamGridProps {
    teams: Team[];
}

export const TeamGrid: React.FC<TeamGridProps> = ({ teams }) => {
    return (
        <div className="bg-[#021029]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 h-full flex flex-col shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10 flex-none">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <Trophy className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-white tracking-wide uppercase">Ranking de Equipes</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto relative z-10 custom-scrollbar pr-1">
                {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                ))}
            </div>
        </div>
    );
};
