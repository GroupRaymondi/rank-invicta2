import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Edit2, Check, X, Loader2 } from 'lucide-react';
import { formatName } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface SaleEvent {
    id: string;
    seller_name: string;
    team_name: string;
    sale_value: number;
    dependents_count: number;
    created_at: string;
    process_type: string;
    seller_id: string; // Needed for filtering
}

const countProcessTypes = (typeStr: string | null | undefined): number => {
    if (!typeStr) return 1;
    const parts = typeStr.split(/[\+,]/).map(s => s.trim()).filter(s => s.length > 0);
    return parts.length || 1;
};

interface SalesTableProps {
    isAdmin?: boolean;
}

export const SalesTable = ({ isAdmin = false }: SalesTableProps) => {
    const { user } = useAuth();
    const [sales, setSales] = useState<SaleEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number | string>(0);
    const [updating, setUpdating] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState<string>('current');

    // ... rest of component

    // Generate weeks options (Current + 4 previous weeks)
    const getWeekOptions = () => {
        const options = [];
        const today = new Date();
        // Adjust to Monday of current week
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const currentMonday = new Date(today.setDate(diff));
        currentMonday.setHours(0, 0, 0, 0);

        for (let i = 0; i < 5; i++) {
            const startStr = new Date(currentMonday);
            startStr.setDate(startStr.getDate() - (i * 7));

            const endStr = new Date(startStr);
            endStr.setDate(endStr.getDate() + 5); // Saturday
            endStr.setHours(23, 59, 59, 999);

            const label = i === 0
                ? 'Semana Atual'
                : `${startStr.toLocaleDateString('pt-BR')} - ${endStr.toLocaleDateString('pt-BR')}`;

            options.push({
                value: startStr.toISOString(), // Start date as value
                label,
                end: endStr.toISOString()
            });
        }
        return options;
    };

    const weekOptions = getWeekOptions();


    const fetchSales = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('sales_events')
                .select('id, seller_name, team_name, sale_value, dependents_count, created_at, process_type, seller_id')
                .order('created_at', { ascending: false });

            // Apply Date Filter
            const selectedOpt = weekOptions.find(o => o.value === selectedWeek);
            if (selectedOpt) {
                const startDate = selectedOpt.value;
                const endDate = selectedOpt.end;
                query = query.gte('created_at', startDate).lte('created_at', endDate);
            } else if (selectedWeek === 'current') {
                const opt = weekOptions[0];
                query = query.gte('created_at', opt.value).lte('created_at', opt.end);
            }

            // Apply User Filter (if not Admin)
            if (!isAdmin && user) {
                query = query.eq('seller_id', user.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchSales();
    }, [selectedWeek, user, isAdmin]); // Re-fetch when week/user/role changes

    const handleEdit = (sale: SaleEvent) => {
        setEditingId(sale.id);
        setEditValue(sale.dependents_count || 0);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleSaveEdit = async (id: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('sales_events')
                .update({ dependents_count: typeof editValue === 'string' ? 0 : editValue })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setSales(sales.map(s => s.id === id ? { ...s, dependents_count: typeof editValue === 'string' ? 0 : editValue } : s));
            setEditingId(null);
        } catch (error) {
            console.error('Error updating sale:', error);
            alert('Erro ao atualizar. Tente novamente.');
        } finally {
            setUpdating(false);
        }
    };

    const filteredSales = sales.filter(sale =>
        sale.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.team_name && sale.team_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-8 text-center text-gray-400">Carregando vendas...</div>;

    return (
        <div className="bg-[#0f172a] rounded-xl border border-white/10 overflow-hidden shadow-xl">
            {/* Header / Filters */}
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5">
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-4xl">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por vendedor ou equipe..."
                            className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Week Filter */}
                    <select
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                        {weekOptions.map((opt, i) => (
                            <option key={i} value={opt.value} className="bg-[#0f172a]">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-gray-400">
                    Mostrando {filteredSales.length} vendas
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-black/20 text-gray-400 uppercase text-xs font-semibold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Vendedor / Equipe</th>
                            <th className="px-6 py-4">Tipo Processo</th>
                            <th className="px-6 py-4 text-center">Dependentes</th>
                            <th className="px-6 py-4 text-center">Total Processos</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                    {new Date(sale.created_at).toLocaleDateString()}
                                    <span className="block text-xs text-gray-500">
                                        {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-white">{formatName(sale.seller_name)}</div>
                                    <div className="text-xs text-blue-400">{sale.team_name || '-'}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-300">
                                    {sale.process_type || 'N/A'}
                                </td>

                                {/* Editable Dependent Count */}
                                <td className="px-6 py-4 text-center">
                                    {editingId === sale.id ? (
                                        <div className="flex items-center justify-center relative z-20">
                                            <input
                                                type="number"
                                                min="0"
                                                autoFocus
                                                className="w-16 bg-black/40 border border-primary rounded px-2 py-1 text-center text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                value={editValue}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEditValue(val === '' ? '' : parseInt(val));
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(sale.id);
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">{sale.dependents_count}</span>
                                    )}
                                </td>

                                {/* Calculated Total Process (Process Types + Dependents [Max 2]) */}
                                <td className="px-6 py-4 text-center font-bold text-yellow-500">
                                    {editingId === sale.id
                                        ? countProcessTypes(sale.process_type) + Math.min(typeof editValue === 'number' ? editValue : 0, 2)
                                        : countProcessTypes(sale.process_type) + Math.min(sale.dependents_count || 0, 2)}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right">
                                    {editingId === sale.id ? (
                                        <div className="flex items-center justify-end gap-2 relative z-20">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSaveEdit(sale.id);
                                                }}
                                                disabled={updating}
                                                className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors cursor-pointer"
                                                title="Salvar"
                                            >
                                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancelEdit();
                                                }}
                                                disabled={updating}
                                                className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors cursor-pointer"
                                                title="Cancelar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(sale);
                                            }}
                                            className="p-1.5 bg-white/5 text-gray-400 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer relative z-10 hover:scale-110 active:scale-95 duration-200"
                                            title="Editar Número de Dependentes"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredSales.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    Nenhuma venda encontrada com os filtros atuais.
                </div>
            )}
        </div>
    );
};
