import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Loader2, Filter, Eye } from 'lucide-react';
import { formatName } from '../../lib/utils';
import { ReviewModal } from './ReviewModal';

interface SaleProcess {
    id: string;
    created_at: string;
    responsible_id: string;
    seller_name?: string;
    seller_avatar_url?: string; // We'll fetch this from profile join
    team_name?: string; // We'll fetch this from profile join
    process_type_name: string;
    dependents: any;
    contract_value: number;
    paid_amount: number;
    approval_status: 'PENDENTE_APROVACAO' | 'EM_REVISAO' | 'APROVADA' | 'REPROVADA' | 'AJUSTE_SOLICITADO';
    client_name?: string;
}

export const ApprovalQueue = () => {
    const [sales, setSales] = useState<SaleProcess[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL_PENDING');

    // Modal State
    const [selectedSale, setSelectedSale] = useState<SaleProcess | null>(null);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            // Fetch sales processes
            let query = supabase
                .from('sales_processes')
                .select(`
                    id, 
                    created_at, 
                    responsible_id, 
                    process_type_name, 
                    dependents, 
                    contract_value, 
                    paid_amount, 
                    approval_status,
                    approval_status,
                    created_by,
                    client_name
                `)
                .order('created_at', { ascending: false });

            // Apply Filters
            if (selectedStatus === 'ALL_PENDING') {
                query = query.in('approval_status', ['PENDENTE_APROVACAO', 'EM_REVISAO', 'AJUSTE_SOLICITADO']);
            } else {
                query = query.eq('approval_status', selectedStatus);
            }

            const { data: salesData, error } = await query;
            if (error) throw error;

            // Fetch Profiles to attach names/teams (since we might not have efficient joins or view setup)
            // Or use an .in() query if list is small. 
            // Better: Get all relevant profiles in one go.
            const userIds = [...new Set(salesData.map(s => s.responsible_id || s.created_by))];

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, team, avatar_url')
                .in('id', userIds);

            const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

            const enrichedSales = salesData.map(sale => {
                const profile = profilesMap.get(sale.responsible_id || sale.created_by);
                return {
                    ...sale,
                    seller_name: profile?.full_name || 'Desconhecido',
                    seller_avatar_url: profile?.avatar_url,
                    team_name: profile?.team
                };
            });

            setSales(enrichedSales);

        } catch (error) {
            console.error('Error fetching queue:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, [selectedStatus]);

    // Keep selectedSale in sync with the latest data
    useEffect(() => {
        if (selectedSale) {
            const updatedSale = sales.find(s => s.id === selectedSale.id);
            if (updatedSale) {
                setSelectedSale(updatedSale);
            }
        }
    }, [sales]);

    const filteredSales = sales.filter(sale =>
        sale.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.process_type_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-4 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar vendas..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="appearance-none bg-black/20 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <option value="ALL_PENDING" className="bg-[#0f172a]">Todos Pendentes</option>
                            <option value="PENDENTE_APROVACAO" className="bg-[#0f172a]">Pendente Aprovação</option>
                            <option value="EM_REVISAO" className="bg-[#0f172a]">Em Revisão</option>
                            <option value="AJUSTE_SOLICITADO" className="bg-[#0f172a]">Ajuste Solicitado</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                <div className="text-xs text-gray-400">
                    {sales.length} vendas aguardando
                </div>
            </div>

            {/* Grid/Table */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : filteredSales.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p className="text-gray-400">Nenhuma venda na fila.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredSales.map((sale) => (
                        <div
                            key={sale.id}
                            onClick={() => setSelectedSale(sale)}
                            className="group bg-[#0f172a] hover:bg-[#1e293b] border border-white/10 rounded-xl p-4 transition-all hover:border-primary/30 cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden"
                        >
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${sale.approval_status === 'PENDENTE_APROVACAO' ? 'bg-yellow-500' :
                                sale.approval_status === 'EM_REVISAO' ? 'bg-blue-500' :
                                    'bg-orange-500'
                                }`} />

                            <div className="flex-1 min-w-0 pl-3">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-bold text-white truncate text-lg group-hover:text-primary transition-colors">
                                        {formatName(sale.seller_name || 'Desconhecido')}
                                    </h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                                        {sale.team_name || '-'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">
                                        {sale.process_type_name}
                                    </span>
                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                    <span>
                                        {new Date(sale.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 px-4 border-l border-white/5">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Entrada</div>
                                    <div className="text-green-400 font-bold whitespace-nowrap">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sale.paid_amount || 0)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
                                    <div className="text-white font-medium whitespace-nowrap">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sale.contract_value || 0)}
                                    </div>
                                </div>
                            </div>

                            <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white">
                                    <Eye className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {selectedSale && (
                <ReviewModal
                    sale={selectedSale}
                    isOpen={!!selectedSale}
                    onClose={() => setSelectedSale(null)}
                    onUpdate={fetchQueue}
                />
            )}
        </div>
    );
};
