import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Users, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { formatName } from '../../lib/utils';
import clsx from 'clsx';

interface TeamMember {
    id: string;
    name: string;
    sales: number;
    avatar_url?: string;
}

interface TeamData {
    name: string;
    members: TeamMember[];
    totalSales: number;
}

export const TeamReport = () => {
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, team, avatar_url')
                    .not('team', 'is', null)
                    .order('full_name');

                if (profilesError) throw profilesError;

                const { data: ranking, error: rankingError } = await supabase.rpc('get_weekly_ranking_for_date');
                if (rankingError) throw rankingError;

                const salesMap = new Map<string, number>();
                (ranking || []).forEach((item: any) => {
                    salesMap.set(item.seller_id, Number(item.total_lives || 0));
                });

                const teamsMap = new Map<string, TeamData>();

                profiles?.forEach((profile: any) => {
                    if (!profile.team) return;

                    let teamName = String(profile.team).trim();
                    if (teamName === 'Titãs') teamName = 'Titans';
                    if (teamName.toLowerCase() === 'canadá' || teamName.toLowerCase() === 'canada') teamName = 'Diamond';

                    const teamKey = teamName.toLowerCase();

                    if (!teamsMap.has(teamKey)) {
                        teamsMap.set(teamKey, { name: teamName, members: [], totalSales: 0 });
                    }

                    const sales = salesMap.get(profile.id) || 0;
                    const team = teamsMap.get(teamKey)!;

                    team.members.push({
                        id: profile.id,
                        name: formatName(profile.full_name),
                        sales,
                        avatar_url: profile.avatar_url,
                    });

                    team.totalSales += sales;
                });

                const sortedTeams = Array.from(teamsMap.values())
                    .map((team) => {
                        team.members.sort((a, b) => {
                            if (b.sales !== a.sales) return b.sales - a.sales;
                            return a.name.localeCompare(b.name);
                        });
                        return team;
                    })
                    .sort((a, b) => b.totalSales - a.totalSales);

                setTeams(sortedTeams);
                setExpandedTeams(new Set(sortedTeams.map((t) => t.name)));
            } catch (error) {
                console.error('Error fetching team report:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const toggleTeam = (teamName: string) => {
        setExpandedTeams((prev) => {
            const next = new Set(prev);
            if (next.has(teamName)) next.delete(teamName);
            else next.add(teamName);
            return next;
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredTeams = teams
        .map((team) => {
            const term = searchTerm.toLowerCase().trim();
            if (!term) return team;

            const nameMatch = team.name.toLowerCase().includes(term);
            const matchingMembers = team.members.filter((m) => m.name.toLowerCase().includes(term));

            if (nameMatch) return team;
            if (matchingMembers.length > 0) return { ...team, members: matchingMembers };
            return null;
        })
        .filter(Boolean) as TeamData[];

    if (loading) return <div className="p-8 text-center text-gray-400">Carregando relatório...</div>;

    return (
        <div className="print-section h-full flex flex-col">
            {/* Header Sticky */}
            <div className="flex-none p-4 border-b border-white/10 bg-[#0f172a] z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Relatório de Equipes
                        </h2>
                        <p className="text-sm text-gray-400">Visão geral e ranking</p>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition-colors text-xs font-bold border border-yellow-500/20"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Filtrar equipe ou vendedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {filteredTeams.map((team) => (
                    <div key={team.name} className="border border-white/10 rounded-lg bg-white/5 overflow-hidden">
                        {/* Team Header (Accordion Trigger) */}
                        <button
                            onClick={() => toggleTeam(team.name)}
                            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
                            type="button"
                        >
                            <div className="flex items-center gap-2">
                                {expandedTeams.has(team.name) ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="font-bold text-sm tracking-wide">{team.name.toUpperCase()}</span>
                                <span className="text-xs text-gray-500 bg-black/20 px-2 py-0.5 rounded-full">
                                    {team.members.length} membros
                                </span>
                            </div>

                            <div className="text-sm font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                                Total: {team.totalSales}
                            </div>
                        </button>

                        {/* Team Members List */}
                        {expandedTeams.has(team.name) && (
                            <div className="divide-y divide-white/5 border-t border-white/5">
                                {team.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className={clsx(
                                            'flex items-center justify-between p-2 px-3 hover:bg-white/5 transition-colors',
                                            member.sales === 0 && 'opacity-50'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                                {member.avatar_url ? (
                                                    <img
                                                        src={member.avatar_url}
                                                        alt={member.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    member.name.charAt(0)
                                                )}
                                            </div>

                                            <span className="text-sm text-gray-300">{member.name}</span>
                                        </div>

                                        <span
                                            className={clsx(
                                                'text-xs font-bold px-2 py-0.5 rounded',
                                                member.sales > 0 ? 'text-green-400 bg-green-400/10' : 'text-gray-500 bg-gray-500/10'
                                            )}
                                        >
                                            {member.sales}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {filteredTeams.length === 0 && (
                    <div className="text-center text-gray-500 py-8 text-sm">Nenhuma equipe encontrada.</div>
                )}
            </div>

            {/* Print Styles */}
            <style>{`
@media print {
  body * { visibility: hidden; }
  .print-section, .print-section * { visibility: visible; }
  .print-section { position: absolute; left: 0; top: 0; width: 100%; }
}
      `}</style>
        </div>
    );
};