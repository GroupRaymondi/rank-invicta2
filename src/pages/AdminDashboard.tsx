import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, CheckSquare, List } from 'lucide-react';
import { SalesTable } from '../components/admin/SalesTable';
import { ApprovalQueue } from '../components/admin/ApprovalQueue';
import { SellerSalesList } from '../components/admin/SellerSalesList';
import { supabase } from '../lib/supabase';

export const AdminDashboard = () => {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loadingRole, setLoadingRole] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            if (!user) return;
            try {
                // Check if user has admin role
                const { data, error } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('role', 'admin')
                    .single();

                if (data && !error) {
                    setIsAdmin(true);
                }
            } catch (e) {
                // Not admin
                setIsAdmin(false);
            } finally {
                setLoadingRole(false);
            }
        };

        checkRole();
    }, [user]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white">
            {/* Header */}
            <nav className="bg-[#0f172a] border-b border-white/10 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <LayoutDashboard className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-wide">Painel {isAdmin ? 'Administrativo' : 'de Vendas'}</h1>
                        <p className="text-xs text-gray-400">Gerenciamento de Vendas e Processos</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-400 hidden sm:inline-block">
                        {user?.email} {isAdmin && <span className="text-primary font-bold">(Admin)</span>}
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20 text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair
                    </button>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-7xl mx-auto p-8 space-y-12">

                {/* Section: Queue / My Requests */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-lg ${isAdmin ? 'bg-yellow-500/10' : 'bg-blue-500/10'}`}>
                            {isAdmin ? <CheckSquare className="w-6 h-6 text-yellow-500" /> : <List className="w-6 h-6 text-blue-500" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {isAdmin ? 'Fila de Aprovação' : 'Minhas Solicitações'}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {isAdmin
                                    ? 'Vendas aguardando revisão do administrador'
                                    : 'Acompanhe o status dos seus processos'
                                }
                            </p>
                        </div>
                    </div>

                    {!loadingRole && (
                        isAdmin ? <ApprovalQueue /> : <SellerSalesList />
                    )}
                </section>

                <hr className="border-white/10" />

                {/* Section: History */}
                <section>

                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Histórico de Eventos (TV)</h2>
                            <p className="text-gray-400 text-sm">
                                {isAdmin
                                    ? 'Visualize e edite os eventos já disparados para a TV.'
                                    : 'Suas vendas aprovadas que já passaram na TV.'
                                }
                            </p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={async () => {
                                    if (confirm('Tem certeza? Isso irá ZERAR o ranking atual para todos os usuários.')) {
                                        try {
                                            const { error } = await supabase.rpc('reset_ranking_start_date');
                                            if (error) throw error;
                                            alert('Ranking zerado com sucesso!');
                                            // Optional: reload or refresh data
                                            window.location.reload();
                                        } catch (e) {
                                            console.error(e);
                                            alert('Erro ao zerar ranking.');
                                        }
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 transition-colors font-bold text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /></svg>
                                Resetar Contagem Manual
                            </button>
                        )}
                    </div>
                    <SalesTable isAdmin={isAdmin} />
                </section>
            </main>
        </div >
    );
};
