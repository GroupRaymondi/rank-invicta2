import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Loader2, Filter, AlertTriangle, Edit2 } from 'lucide-react';
import { formatName } from '../../lib/utils';
import { ReviewModal } from './ReviewModal';
import { useAuth } from '../../contexts/AuthContext';

interface SaleProcess {
    id: string;
    created_at: string;
    responsible_id: string;
    seller_name?: string;
    seller_avatar_url?: string;
    team_name?: string;
    process_type_name: string;
    dependents: any;
    contract_value: number;
    paid_amount: number;
    approval_status: 'PENDENTE_APROVACAO' | 'EM_REVISAO' | 'APROVADA' | 'REPROVADA' | 'AJUSTE_SOLICITADO';
    rejection_reason?: string;
    adjustment_request_reason?: string;
}

export const SellerSalesList = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState<SaleProcess[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL_ACTIVE');
    const [selectedSale, setSelectedSale] = useState<SaleProcess | null>(null);

    const fetchMySales = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let query = supabase
                .from('sales_processes')
                .select('*')
                .neq('approval_status', 'APROVADA') // Only show non-approved (Tracking)
                .order('created_at', { ascending: false });

            // Apply Filters
            if (selectedStatus !== 'ALL_ACTIVE') {
                query = query.eq('approval_status', selectedStatus);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Enrich with profile info (even if it's me, useful for consistency)
            // For seller view, seller is me.
            const enrichedSales = data.map(sale => ({
                ...sale,
                seller_name: 'Você', // Or fetch profile if needed
                seller_avatar_url: user.user_metadata?.avatar_url
            }));

            // If we really want my name from profile
            // const { data: profile } = await supabase.from('profiles').select('full_name, team').eq('id', user.id).single();
            // ...

            setSales(enrichedSales);

        } catch (error) {
            console.error('Error fetching my sales:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMySales();
    }, [user, selectedStatus]);

    const filteredSales = sales.filter(sale =>
        sale.process_type_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-4 w-full sm:w-auto">
                    <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar processos..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="appearance-none bg-black/20 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <option value="ALL_ACTIVE" className="bg-[#0f172a]">Todos Ativos</option>
                            <option value="PENDENTE_APROVACAO" className="bg-[#0f172a]">Pendente</option>
                            <option value="EM_REVISAO" className="bg-[#0f172a]">Em Revisão</option>
                            <option value="AJUSTE_SOLICITADO" className="bg-[#0f172a]">Ajuste Solicitado</option>
                            <option value="REPROVADA" className="bg-[#0f172a]">Reprovada</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : filteredSales.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 border-dashed">
                    <p className="text-gray-400">Nenhum processo em andamento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredSales.map((sale) => (
                        <div
                            key={sale.id}
                            onClick={() => setSelectedSale(sale)} // Open Modal to View/Edit
                            className="group bg-[#0f172a] hover:bg-[#1e293b] border border-white/10 rounded-xl p-4 transition-all hover:border-primary/30 cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden"
                        >
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${sale.approval_status === 'PENDENTE_APROVACAO' ? 'bg-yellow-500' :
                                    sale.approval_status === 'EM_REVISAO' ? 'bg-blue-500' :
                                        sale.approval_status === 'REPROVADA' ? 'bg-red-500' :
                                            'bg-orange-500' // AJUSTE
                                }`} />

                            <div className="flex-1 min-w-0 pl-3">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${sale.approval_status === 'PENDENTE_APROVACAO' ? 'bg-yellow-500/10 text-yellow-500' :
                                            sale.approval_status === 'EM_REVISAO' ? 'bg-blue-500/10 text-blue-500' :
                                                sale.approval_status === 'REPROVADA' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-orange-500/10 text-orange-500'
                                        }`}>
                                        {sale.approval_status.replace('_', ' ')}
                                    </span>
                                </div>
                                <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                    {sale.process_type_name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                    <span>
                                        {new Date(sale.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {(sale.approval_status === 'REPROVADA' || sale.approval_status === 'AJUSTE_SOLICITADO') && (
                                    <div className="mt-2 text-sm bg-white/5 p-2 rounded text-gray-300 flex items-start gap-2">
                                        <AlertTriangle className={`w-4 h-4 mt-0.5 ${sale.approval_status === 'REPROVADA' ? 'text-red-500' : 'text-orange-500'
                                            }`} />
                                        <span>
                                            {sale.rejection_reason || sale.adjustment_request_reason || 'Sem motivo informado.'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-8 px-4 border-l border-white/5">
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Entrada</div>
                                    <div className="text-green-400 font-bold whitespace-nowrap">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sale.paid_amount || 0)}
                                    </div>
                                </div>
                            </div>

                            {sale.approval_status === 'AJUSTE_SOLICITADO' && (
                                <div className="pr-2">
                                    <div className="p-2 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30 transition-colors animate-pulse">
                                        <Edit2 className="w-5 h-5" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedSale && (
                <ReviewModal
                    sale={selectedSale}
                    isOpen={!!selectedSale}
                    onClose={() => setSelectedSale(null)}
                    onUpdate={fetchMySales}
                />
            )}
        </div>
    );
};
