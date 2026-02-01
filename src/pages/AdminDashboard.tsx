import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { SalesTable } from '../components/admin/SalesTable';

export const AdminDashboard = () => {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();

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
                        <h1 className="text-xl font-bold tracking-wide">Painel Administrativo</h1>
                        <p className="text-xs text-gray-400">Gerenciamento de Vendas e Processos</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-400 hidden sm:inline-block">
                        {user?.email}
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
            <main className="max-w-7xl mx-auto p-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Histórico de Vendas</h2>
                    <p className="text-gray-400">Visualize e edite os dependentes/processos de cada venda.</p>
                </div>

                <SalesTable />
            </main>
        </div>
    );
};
