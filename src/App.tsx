import { useMemo, useEffect, useState } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { KPICards } from './components/dashboard/KPICards';
import { RankingList } from './components/dashboard/RankingList';
import { TeamGrid, type Team } from './components/dashboard/TeamGrid';
import { SalesAlert } from './components/dashboard/SalesAlert';
import { Podium } from './components/dashboard/Podium';
// import { AuthProvider, useAuth } from './contexts/AuthContext';
// import { Login } from './pages/Login';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

// Types for Supabase Data
interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  team: string;
}

interface MonthlySales {
  seller_id: string;
  deals_closed: number;
  total_sales: number;
}

const DashboardContent = () => {
  // const { user, loading: authLoading } = useAuth(); // Auth removed
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sales, setSales] = useState<MonthlySales[]>([]);

  const [alertData, setAlertData] = useState<{ isVisible: boolean; sellerName?: string; value?: number }>({ isVisible: false });

  useEffect(() => {
    // Removed user check to allow public access

    const fetchData = async () => {
      try {
        // Fetch Profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, team')
          .eq('status', 'ativo');

        if (profilesError) throw profilesError;

        // Fetch Sales
        const { data: salesData, error: salesError } = await supabase
          .from('seller_monthly_sales')
          .select('seller_id, deals_closed, total_sales');

        if (salesError) throw salesError;

        setProfiles(profilesData || []);
        setSales(salesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime Subscription
    const salesSubscription = supabase
      .channel('sales_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_monthly_sales' }, (payload) => {
        console.log('Realtime Payload:', payload);
        // Refresh data
        fetchData();

        // Check for new sale (UPDATE or INSERT)
        if (payload.eventType === 'UPDATE') {
          const newRecord = payload.new as { seller_id: string; deals_closed: number; total_sales: number };
          const oldRecord = payload.old as { seller_id: string; deals_closed: number; total_sales: number };

          console.log('Update detected:', { new: newRecord, old: oldRecord });

          if (oldRecord && newRecord.deals_closed > oldRecord.deals_closed) {
            const valueDiff = newRecord.total_sales - oldRecord.total_sales;
            triggerAlert(newRecord.seller_id, valueDiff);
          }
        } else if (payload.eventType === 'INSERT') {
          const newRecord = payload.new as { seller_id: string; deals_closed: number; total_sales: number };

          console.log('Insert detected:', newRecord);

          if (newRecord.deals_closed > 0) {
            triggerAlert(newRecord.seller_id, newRecord.total_sales);
          }
        }
      })
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
    };
  }, []); // Removed user dependency

  const triggerAlert = (sellerId: string, value: number) => {
    supabase.from('profiles').select('full_name').eq('id', sellerId).single()
      .then(({ data }) => {
        if (data) {
          console.log('Triggering alert for:', data.full_name, 'Value:', value);
          setAlertData({
            isVisible: true,
            sellerName: data.full_name,
            value: value > 0 ? value : undefined
          });
        }
      });
  };

  // Process Data
  const processedData = useMemo(() => {
    // Map sales by seller
    const salesBySeller: Record<string, number> = {};
    sales.forEach(sale => {
      salesBySeller[sale.seller_id] = (salesBySeller[sale.seller_id] || 0) + sale.deals_closed;
    });

    // Create Sellers List for Ranking
    const sellers = profiles.map(profile => ({
      id: profile.id,
      name: profile.full_name || 'Desconhecido',
      avatar: profile.avatar_url,
      deals: salesBySeller[profile.id] || 0,
      team: profile.team
    })).sort((a, b) => b.deals - a.deals);

    // Fixed Teams List
    const KNOWN_TEAMS = ['Titans', 'Phoenix', 'Premium', 'Canadá', 'Legacy Global', 'Seguro Champions'];

    // Create Teams Data
    const teamsMap: Record<string, Team> = {};

    // Initialize known teams
    KNOWN_TEAMS.forEach(teamName => {
      teamsMap[teamName] = {
        id: teamName,
        name: teamName,
        amount: 0,
        members: 0,
        rank: 0,
        processes: 0,
        topMembers: []
      };
    });

    sellers.forEach(seller => {
      if (!seller.team) return;

      // Normalize team name (handle Titãs vs Titans if needed, or just case insensitivity)
      // For now, let's assume exact match or simple mapping if needed.
      // If the seller has "Titãs" and we have "Titans" in KNOWN_TEAMS, we need to map it.
      // Or just add "Titãs" to KNOWN_TEAMS if we want both? No, user wants to fix duplication.
      // Let's map "Titãs" to "Titans" if found.
      let teamName = seller.team;
      if (teamName === 'Titãs') teamName = 'Titans';

      // If team is not in known list, add it (or ignore depending on requirement, but better to add)
      if (!teamsMap[teamName]) {
        teamsMap[teamName] = {
          id: teamName,
          name: teamName,
          amount: 0,
          members: 0,
          rank: 0,
          processes: 0,
          topMembers: []
        };
      }

      const team = teamsMap[teamName];
      team.members += 1;
      team.processes += seller.deals;
      team.topMembers.push({ name: seller.name, processes: seller.deals });
    });

    const teams = Object.values(teamsMap).sort((a, b) => b.processes - a.processes).map((team, index) => ({
      ...team,
      rank: index + 1,
      topMembers: team.topMembers
        .filter(m => m.processes > 0) // Only show members with sales
        .sort((a, b) => b.processes - a.processes)
        .slice(0, 3)
    }));

    const totalProcesses = sellers.reduce((acc, seller) => acc + seller.deals, 0);

    return { sellers, teams, totalProcesses };
  }, [profiles, sales]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout className="p-4 gap-4">
      {/* Header Removed */}

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Ranking List */}
        <div className="col-span-3 h-full animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <RankingList sellers={processedData.sellers} />
        </div>

        {/* Center Column: Logo, Podium, KPI */}
        {/* Center Column: Logo, Podium, KPI */}
        <div className="col-span-6 h-full flex flex-col relative py-4" style={{ animationDelay: '0.2s' }}>

          {/* 1. Logo & Name (Top) */}
          <div className="flex-none flex flex-col items-center justify-start relative z-20 pt-2">
            <div className="w-24 h-24 relative group mb-1">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img src="/logo.png" alt="Invicta Consulting" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(14,165,233,0.3)] relative z-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest text-glow text-center drop-shadow-lg">
              INVICTA MATRIZ
            </h1>
          </div>

          {/* 2. KPI (Middle - Raised slightly) */}
          <div className="flex-1 flex items-center justify-center relative z-20 min-h-0 pb-32">
            <div className="transform scale-150 hover:scale-155 transition-transform duration-300">
              <KPICards totalProcesses={processedData.totalProcesses} />
            </div>
          </div>

          {/* 3. Podium (Bottom) */}
          <div className="flex-none flex items-end justify-center relative z-10 pb-6">
            {/* Pass top 3 sellers to Podium */}
            <Podium winners={processedData.sellers.slice(0, 3).map((s, i) => ({
              id: s.id,
              name: s.name,
              amount: s.deals, // Using deals as amount for now
              position: (i + 1) as 1 | 2 | 3,
              avatar: s.avatar
            }))} />
          </div>
        </div>

        {/* Right Column: Team Grid */}
        <div className="col-span-3 h-full animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <TeamGrid teams={processedData.teams} />
        </div>
      </div>

      {/* Sales Alert */}
      <SalesAlert
        isVisible={alertData.isVisible}
        sellerName={alertData.sellerName}
        value={alertData.value}
        onComplete={() => setAlertData(prev => ({ ...prev, isVisible: false }))}
      />
    </DashboardLayout>
  );
};

function App() {
  return (
    <DashboardContent />
  );
}

export default App;
