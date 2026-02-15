import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Check, AlertTriangle, MessageSquare, Save, Loader2 } from 'lucide-react';
import { formatName } from '../../lib/utils';

interface SaleProcess {
    id: string;
    created_at: string;
    responsible_id: string;
    seller_name?: string;
    seller_avatar_url?: string;
    team_name?: string;
    process_type_name: string;
    dependents: any; // jsonb
    contract_value: number;
    paid_amount: number; // Down Payment
    client_name?: string;
    approval_status: 'PENDENTE_APROVACAO' | 'EM_REVISAO' | 'APROVADA' | 'REPROVADA' | 'AJUSTE_SOLICITADO';
    notes?: string;
    rejection_reason?: string;
    adjustment_request_reason?: string;
}

interface ReviewModalProps {
    sale: SaleProcess;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Refresh list
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ sale, isOpen, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<'APPROVE' | 'REJECT' | 'REQUEST_ADJUSTMENT' | null>(null);
    const [reason, setReason] = useState('');

    // Editable Fields State
    const [editMode, setEditMode] = useState(false);
    const [editedValues, setEditedValues] = useState({
        process_type_name: sale.process_type_name,
        contract_value: sale.contract_value,
        paid_amount: sale.paid_amount,
        dependents_count: Array.isArray(sale.dependents) ? sale.dependents.length : 0
    });

    if (!isOpen) return null;

    const handleAction = async () => {
        if (!action) return;
        if ((action === 'REJECT' || action === 'REQUEST_ADJUSTMENT') && !reason.trim()) {
            alert('Por favor, informe o motivo.');
            return;
        }

        setLoading(true);
        try {
            const updates: any = {
                admin_reviewed_at: new Date(),
                // admin_reviewed_by: user.id // Handled by RLS or trigger ideally, but here explicitly if needed
            };

            if (action === 'APPROVE') {
                updates.approval_status = 'APROVADA';
                updates.approved_at = new Date();
            } else if (action === 'REJECT') {
                updates.approval_status = 'REPROVADA';
                updates.rejection_reason = reason;
            } else if (action === 'REQUEST_ADJUSTMENT') {
                updates.approval_status = 'AJUSTE_SOLICITADO';
                updates.adjustment_request_reason = reason;
            }

            const { error } = await supabase
                .from('sales_processes')
                .update(updates)
                .eq('id', sale.id);

            if (error) throw error;

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating sale:', error);
            alert(`Erro ao processar ação: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            // Update dependents array based on count
            let newDependents = Array.isArray(sale.dependents) ? [...sale.dependents] : [];
            const currentCount = newDependents.length;
            const targetCount = editedValues.dependents_count;

            if (targetCount > currentCount) {
                // Add placeholders
                for (let i = 0; i < targetCount - currentCount; i++) {
                    newDependents.push({ name: 'Dependente Adicionado pelo Admin', relationship: 'other' });
                }
            } else if (targetCount < currentCount) {
                // Remove from end
                newDependents = newDependents.slice(0, targetCount);
            }

            const { error } = await supabase
                .from('sales_processes')
                .update({
                    process_type_name: editedValues.process_type_name,
                    contract_value: editedValues.contract_value,
                    paid_amount: editedValues.paid_amount,
                    dependents: newDependents
                })
                .eq('id', sale.id);

            if (error) throw error;

            setEditMode(false);
            onUpdate(); // Refresh parent to get new data
        } catch (error) {
            console.error('Error saving changes:', error);
            alert('Erro ao salvar alterações.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white">Revisão de Venda</h2>
                        <div className="text-sm text-gray-400 mt-1">
                            <span>ID: {sale.id.slice(0, 8)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 flex-1">

                    {/* Seller Info */}
                    <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-white/10">
                            {sale.seller_avatar_url ? (
                                <img src={sale.seller_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                    {sale.seller_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{formatName(sale.seller_name || 'Desconhecido')}</h3>
                            <p className="text-sm text-blue-400">{sale.team_name || 'Sem Equipe'}</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${sale.approval_status === 'PENDENTE_APROVACAO' ? 'bg-yellow-500/20 text-yellow-500' :
                                sale.approval_status === 'EM_REVISAO' ? 'bg-blue-500/20 text-blue-500' :
                                    sale.approval_status === 'AJUSTE_SOLICITADO' ? 'bg-orange-500/20 text-orange-500' :
                                        'bg-gray-500/20 text-gray-500'
                                }`}>
                                {sale.approval_status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Form Fields (Read/Edit) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Cliente (Identificação)</label>
                            <div className="text-lg text-white font-medium border-b border-white/10 pb-1">
                                {sale.client_name || 'Não informado'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Tipo de Processo</label>
                            {editMode ? (
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:ring-1 focus:ring-primary outline-none"
                                    value={editedValues.process_type_name}
                                    onChange={e => setEditedValues({ ...editedValues, process_type_name: e.target.value })}
                                />
                            ) : (
                                <div className="text-lg text-white font-medium">{sale.process_type_name}</div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Dependentes</label>
                            {editMode ? (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setEditedValues({ ...editedValues, dependents_count: Math.max(0, editedValues.dependents_count - 1) })}
                                        className="w-8 h-8 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="text-lg text-white font-bold w-8 text-center">{editedValues.dependents_count}</span>
                                    <button
                                        onClick={() => setEditedValues({ ...editedValues, dependents_count: editedValues.dependents_count + 1 })}
                                        className="w-8 h-8 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            ) : (
                                <div className="text-lg text-white font-medium">
                                    {Array.isArray(sale.dependents) ? sale.dependents.length : 0}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Valor Total (Contrato)</label>
                            {editMode ? (
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white focus:ring-1 focus:ring-primary outline-none"
                                    value={editedValues.contract_value}
                                    onChange={e => setEditedValues({ ...editedValues, contract_value: parseFloat(e.target.value) })}
                                />
                            ) : (
                                <div className="text-lg text-white font-medium">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sale.contract_value || 0)}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Entrada (Down Payment)</label>
                            {editMode ? (
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-green-400 focus:ring-1 focus:ring-primary outline-none"
                                    value={editedValues.paid_amount}
                                    onChange={e => setEditedValues({ ...editedValues, paid_amount: parseFloat(e.target.value) })}
                                />
                            ) : (
                                <div className="text-lg text-green-400 font-bold">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sale.paid_amount || 0)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Toggle */}
                    <div className="flex justify-end">
                        {editMode ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="px-3 py-1 text-sm bg-white/5 hover:bg-white/10 rounded text-gray-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={loading}
                                    className="px-3 py-1 text-sm bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded transition-colors flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Salvar Alterações
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setEditMode(true)}
                                className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-4"
                            >
                                Editar Informações
                            </button>
                        )}
                    </div>

                    {/* Action Area */}
                    <div className="border-t border-white/10 pt-6 mt-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Decisão</h3>

                        {!action ? (
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={() => setAction('APPROVE')}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-all group"
                                >
                                    <div className="p-2 bg-green-500/20 rounded-full group-hover:scale-110 transition-transform">
                                        <Check className="w-6 h-6 text-green-500" />
                                    </div>
                                    <span className="font-bold text-green-500">Aprovar</span>
                                </button>

                                <button
                                    onClick={() => setAction('REQUEST_ADJUSTMENT')}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl transition-all group"
                                >
                                    <div className="p-2 bg-orange-500/20 rounded-full group-hover:scale-110 transition-transform">
                                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <span className="font-bold text-orange-500">Solicitar Ajuste</span>
                                </button>

                                <button
                                    onClick={() => setAction('REJECT')}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all group"
                                >
                                    <div className="p-2 bg-red-500/20 rounded-full group-hover:scale-110 transition-transform">
                                        <X className="w-6 h-6 text-red-500" />
                                    </div>
                                    <span className="font-bold text-red-500">Reprovar</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {action === 'APPROVE' ? (
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-4">
                                        <Check className="w-6 h-6 text-green-500" />
                                        <div>
                                            <p className="font-bold text-green-500">Confirmar Aprovação?</p>
                                            <p className="text-sm text-green-400/70">Isso irá disparar o evento na TV e atualizar o ranking.</p>
                                        </div>
                                        <div className="ml-auto flex gap-2">
                                            <button
                                                onClick={() => setAction(null)}
                                                className="px-3 py-1.5 rounded text-sm hover:bg-white/5"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleAction}
                                                disabled={loading}
                                                className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded shadow-lg shadow-green-500/20 flex items-center gap-2"
                                            >
                                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                                Confirmar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 border border-white/10 p-4 rounded-xl space-y-4">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <MessageSquare className="w-5 h-5 text-gray-400" />
                                            {action === 'REJECT' ? 'Motivo da Reprovação' : 'Solicitação de Ajuste'}
                                        </div>
                                        <textarea
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            placeholder="Descreva o motivo..."
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 min-h-[100px] focus:ring-1 focus:ring-primary outline-none"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setAction(null)}
                                                className="px-3 py-1.5 rounded text-sm hover:bg-white/5 text-gray-400"
                                            >
                                                Voltar
                                            </button>
                                            <button
                                                onClick={handleAction}
                                                disabled={loading || !reason.trim()}
                                                className={`px-4 py-1.5 font-bold rounded shadow-lg flex items-center gap-2 ${action === 'REJECT'
                                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                                                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                                                    }`}
                                            >
                                                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                                                {action === 'REJECT' ? 'Reprovar Venda' : 'Enviar Solicitação'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div >
    );
};
