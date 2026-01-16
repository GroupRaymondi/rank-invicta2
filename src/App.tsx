import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { KPICards } from './components/dashboard/KPICards';
import { RankingList } from './components/dashboard/RankingList';
import { TeamGrid, type Team } from './components/dashboard/TeamGrid';
import { SalesAlert } from './components/dashboard/SalesAlert';
import { Podium } from './components/dashboard/Podium';
// import { AuthProvider, useAuth } from './contexts/AuthContext';
// import { Login } from './pages/Login';
import { supabase } from './lib/supabase';
import { Loader2, Maximize2 } from 'lucide-react';

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

  // Alert State
  const [alertData, setAlertData] = useState<{
    isVisible: boolean;
    id?: string; // Added sale ID
    sellerName?: string;
    sellerAvatar?: string;
    processName?: string;
    entryValue?: number;
  }>({ isVisible: false });



  // Queue System
  const [alertQueue, setAlertQueue] = useState<Array<{
    id: string;
    responsible_id: string;
    created_by?: string; // Added created_by
    seller_id?: string;  // Added seller_id
    process_type_name: string;
    paid_amount: string | number;
  }>>([]);
  const processedSaleIds = useRef<Set<string>>(new Set());
  const isProcessingAlert = useRef(false);

  useEffect(() => {
    // Removed user check to allow public access

    const fetchData = async () => {
      try {
        // Fetch Roles (Only VENDEDOR)
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'vendedor');

        if (rolesError) throw rolesError;

        const vendorIds = new Set(rolesData?.map(r => r.user_id) || []);

        // Fetch Profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, team')
          .eq('status', 'ativo');

        if (profilesError) throw profilesError;

        // Filter profiles to only include vendors
        const vendorProfiles = (profilesData || []).filter(p => vendorIds.has(p.id));
        setProfiles(vendorProfiles);

        // Fetch Sales
        const { data: salesData, error: salesError } = await supabase
          .from('seller_monthly_sales')
          .select('seller_id, deals_closed, total_sales');

        if (salesError) throw salesError;

        setSales(salesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime Subscription for Ranking Updates (Monthly Sales)
    const salesSubscription = supabase
      .channel('sales_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_monthly_sales' }, (payload) => {
        console.log('Monthly Sales Update:', payload);
        // Refresh data only, do NOT trigger alert here anymore
        fetchData();
      })
      .subscribe();

    // Realtime Subscription for New Sales Alerts (Sales Events)
    const newSaleSubscription = supabase
      .channel('new_sale_alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales_events' }, (payload) => {
        console.log('New Sale Event Detected:', payload);
        const newEvent = payload.new as {
          id: string;
          seller_id: string;
          seller_name: string;
          sale_value: string | number;
          entry_value: string | number;
          process_type: string;
          sales_process_id: string;
        };

        // De-duplication check (using event ID)
        if (processedSaleIds.current.has(newEvent.id)) {
          console.log('Duplicate event ignored:', newEvent.id);
          return;
        }

        // Add to processed set
        processedSaleIds.current.add(newEvent.id);

        // Add to Queue
        setAlertQueue(prev => [...prev, {
          id: newEvent.sales_process_id, // Use process ID for consistency if needed, or event ID
          responsible_id: newEvent.seller_id,
          process_type_name: newEvent.process_type,
          paid_amount: newEvent.entry_value,
          // Extra fields from event
          seller_name: newEvent.seller_name
        }]);

        // Also refresh data to ensure ranking is up to date
        fetchData();
      })
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
      newSaleSubscription.unsubscribe();
    };
  }, [profiles]); // Added profiles dependency to ensure lookup works

  // Process Queue
  useEffect(() => {
    const processNextInQueue = async () => {
      if (alertQueue.length === 0 || isProcessingAlert.current || alertData.isVisible) return;

      isProcessingAlert.current = true;
      const nextSale = alertQueue[0];

      try {
        // Find seller avatar from profiles (Local Lookup)
        // We already have the name from the event, but we need the avatar
        let sellerProfile = profiles.find(p => p.id === nextSale.responsible_id);

        // On-Demand Fetch if not found locally
        if (!sellerProfile) {
          console.log('Seller not found locally, fetching from DB:', nextSale.responsible_id);
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, team')
            .eq('id', nextSale.responsible_id)
            .single();

          if (data) {
            sellerProfile = data;
            // Optionally update local state to avoid re-fetching
            setProfiles(prev => [...prev, data]);
          }
        }

        const sellerAvatar = sellerProfile ? sellerProfile.avatar_url : undefined;
        // Use name from event if available, otherwise fallback to profile
        // The event has the snapshot of the name at time of sale, which is good
        const sellerName = (nextSale as any).seller_name || (sellerProfile?.full_name || 'Vendedor');

        // Parse amount (ensure it's a number)
        const entryValue = typeof nextSale.paid_amount === 'string'
          ? parseFloat(nextSale.paid_amount)
          : nextSale.paid_amount;

        // Trigger Alert
        setAlertData({
          isVisible: true,
          id: nextSale.id, // Pass sale ID
          sellerName,
          sellerAvatar,
          processName: nextSale.process_type_name,
          entryValue
        });

        // NOTE: We do NOT remove from queue here anymore. 
        // We wait for handleAlertComplete to ensure the alert finishes.

      } catch (error) {
        console.error('Error processing alert queue:', error);
        // Remove from queue even on error to prevent blocking
        setAlertQueue(prev => prev.slice(1));
        isProcessingAlert.current = false;
      }
    };

    processNextInQueue();
  }, [alertQueue, alertData.isVisible, profiles]);

  const handleAlertComplete = useCallback(() => {
    setAlertData(prev => ({ ...prev, isVisible: false }));
    isProcessingAlert.current = false;
    // Remove the finished alert from the queue to process the next one
    setAlertQueue(prev => prev.slice(1));
  }, []);

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

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout className="p-4 gap-4">
      {/* Fullscreen Toggle */}


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
          <div className="flex-none flex flex-col items-center justify-start relative z-20 pt-10">
            {/* Test Button (Only for testing) */}

            <div className="w-28 h-28 relative mb-4">
              <img src="/logo-new.png" alt="Invicta Consulting" className="w-full h-full object-contain relative z-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest text-glow-accent text-center drop-shadow-lg">
              INVICTA MATRIZ
            </h1>
          </div>

          {/* Spacer to push content down */}
          <div className="flex-1" />

          {/* 2. KPI (Centered in available space) */}
          <div className="flex-none flex items-center justify-center relative z-20 min-h-0">
            <div className="transform scale-125 hover:scale-135 transition-transform duration-300">
              <KPICards totalProcesses={processedData.totalProcesses} />
            </div>
          </div>

          {/* Spacer to push Podium down */}
          <div className="flex-1" />

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

      {/* Controls Container (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end opacity-0 hover:opacity-100 transition-opacity duration-500">

        {/* Presentation Mode Button */}
        <button
          onClick={toggleFullScreen}
          className="group flex items-center gap-3 px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
          title="Modo Apresentação"
        >
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0">
            Modo Apresentação
          </span>
          <div className="p-1 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <Maximize2 className="w-5 h-5" />
          </div>
        </button>

        {/* Test Alert Button */}
        <button
          onClick={() => {
            const randomProfile = profiles.length > 0
              ? profiles[Math.floor(Math.random() * profiles.length)]
              : { id: 'test-id' };

            const testValues = [500, 1000, 2500, 5000];
            const testValue = testValues[Math.floor(Math.random() * testValues.length)];

            const mockSale = {
              id: `test-${Date.now()}`,
              responsible_id: randomProfile.id,
              created_by: randomProfile.id,
              process_type_name: ['VISTO T', 'GREEN CARD', 'CIDADANIA', 'CONSULTORIA'][Math.floor(Math.random() * 4)],
              paid_amount: testValue
            };
            setAlertQueue(prev => [...prev, mockSale]);
          }}
          className="group flex items-center gap-3 px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
          title="Testar Alerta"
        >
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0">
            Testar Alerta
          </span>
          <div className="p-1 rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
            🚀
          </div>
        </button>
      </div>

      {/* Sales Alert */}
      <SalesAlert
        isVisible={alertData.isVisible}
        saleId={alertData.id} // Pass sale ID
        sellerName={alertData.sellerName}
        sellerAvatar={alertData.sellerAvatar}
        processName={alertData.processName}
        entryValue={alertData.entryValue}
        onComplete={handleAlertComplete}
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
