import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { formatName } from './lib/utils';

import { KPICards } from './components/dashboard/KPICards';
import { RankingList } from './components/dashboard/RankingList';
import { TeamGrid, type Team } from './components/dashboard/TeamGrid';
import { SalesAlert } from './components/dashboard/SalesAlert';
import { Podium } from './components/dashboard/Podium';
import { supabase } from './lib/supabase';
import { Loader2, Maximize2 } from 'lucide-react';
import { getAudioRuleByEntryValue } from './lib/saleAudioRules';
import { getRankingPeriod } from './lib/dateUtils';

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

interface SaleAlertData {
  isVisible: boolean;
  id?: string;
  sellerName?: string;
  sellerAvatar?: string;
  processName?: string;
  entryValue?: number;
}

const DashboardContent = () => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sales, setSales] = useState<MonthlySales[]>([]);

  // Alert State
  const [alertData, setAlertData] = useState<SaleAlertData>({ isVisible: false });

  // Queue System
  const [alertQueue, setAlertQueue] = useState<Array<{
    id: string;
    responsible_id: string;
    created_by?: string;
    seller_id?: string;
    process_type_name: string;
    paid_amount: string | number;
    seller_name?: string;
    seller_avatar_url?: string;
  }>>([]);
  const processedSaleIds = useRef(new Set<string>());
  // Map to track processed sales: sales_process_id -> entry_value
  const processedProcessValues = useRef(new Map<string, number>());
  const isProcessingAlert = useRef(false);


  // Audio Refs
  const voicePlayerRef = useRef<HTMLAudioElement>(null);
  const bellPlayerRef = useRef<HTMLAudioElement>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Unlock Audio on First Interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlocked) return;

      const playSilent = async (ref: React.RefObject<HTMLAudioElement | null>) => {
        if (ref.current) {
          try {
            ref.current.volume = 0;
            await ref.current.play();
            ref.current.pause();
            ref.current.currentTime = 0;
            ref.current.volume = 1;
          } catch (e) {
            console.warn('Silent unlock failed', e);
          }
        }
      };

      Promise.all([playSilent(voicePlayerRef), playSilent(bellPlayerRef)]).then(() => {
        console.log('Audio unlocked by user interaction');
        setAudioUnlocked(true);
        // Remove listeners
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      });
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, [audioUnlocked]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Roles (Fetch all, filter in JS for robustness)
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Robust JS Filtering: Case-insensitive, trimmed
        const vendorIds = new Set(
          (rolesData || [])
            .filter(r => r.role && r.role.toLowerCase().trim() === 'vendedor')
            .map(r => r.user_id)
        );

        // Fetch Profiles (Fetch all, filter in JS)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, team, status');

        if (profilesError) throw profilesError;

        // Filter profiles: Must be in vendorIds AND have status 'ativo'
        const vendorProfiles = (profilesData || []).filter(p =>
          vendorIds.has(p.id) &&
          p.status &&
          p.status.toLowerCase().trim() === 'ativo'
        );

        setProfiles(vendorProfiles);

        // Fetch Sales Events for the current ranking period
        const { startDate } = getRankingPeriod();
        console.log('Fetching ranking data from:', startDate.toISOString());

        const { data: eventsData, error: eventsError } = await supabase
          .from('sales_events')
          .select('*')
          .gte('created_at', startDate.toISOString());

        if (eventsError) throw eventsError;

        // Aggregate events into MonthlySales format
        const salesMap = new Map<string, MonthlySales>();

        (eventsData || []).forEach((event: any) => {
          const sellerId = event.seller_id;
          if (!sellerId) return;

          const current = salesMap.get(sellerId) || {
            seller_id: sellerId,
            deals_closed: 0,
            total_sales: 0
          };

          current.deals_closed += 1;

          // Parse entry_value for total_sales (reusing logic from realtime if needed, or simple parse)
          // Assuming DB has cleaner data, but let's be safe-ish
          let val = 0;
          if (typeof event.entry_value === 'number') val = event.entry_value;
          else if (typeof event.entry_value === 'string') {
            // Simple parse for aggregation, assuming standard format in DB
            val = parseFloat(event.entry_value.replace(/[^0-9.-]+/g, ""));
          }

          current.total_sales += isNaN(val) ? 0 : val;
          salesMap.set(sellerId, current);
        });

        setSales(Array.from(salesMap.values()));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime Subscription for Ranking Updates (Now listening to sales_events mostly)
    // We keep the sales-events subscription below which already calls fetchData()
    // so we don't need a separate one for monthly_sales anymore.

    // Realtime Subscription for New Sales Alerts (Sales Events)
    const newSaleSubscription = supabase
      .channel('sales-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_events' }, (payload) => {
        console.log('Sale Event Detected:', payload);

        // Always refresh data to ensure ranking/KPI is up to date
        fetchData();

        // If it's a DELETE or UPDATE event, stop here. Do NOT trigger the alert.
        if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
          console.log('Event is DELETE/UPDATE. Skipping alert.');
          return;
        }

        // Only proceed for INSERT events
        const newEvent = payload.new as {
          id: string;
          seller_id: string;
          seller_name: string;
          seller_avatar_url?: string;
          sale_value: string | number;
          entry_value: string | number;
          process_type: string;
          sales_process_id: string;
        };

        const rawValue = newEvent.entry_value;
        let entryVal: number = 0;

        if (typeof rawValue === 'number') {
          entryVal = rawValue;
        } else if (typeof rawValue === 'string') {
          // Robust parsing for "1.000,00" (PT-BR) or "1000.00" (EN-US)
          // 1. Remove currency symbols and whitespace
          let clean = rawValue.replace(/[^0-9.,]/g, '');

          if (clean.includes(',') && clean.includes('.')) {
            // Has both, assume last one is decimal
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
              // 1.000,00 -> 1000.00
              clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
              // 1,000.00 -> 1000.00
              clean = clean.replace(/,/g, '');
            }
          } else if (clean.includes(',')) {
            // Only comma, assume decimal if it looks like decimal (2 decimal places usually)
            // But safe bet for PT-BR is comma = decimal
            clean = clean.replace(',', '.');
          }

          entryVal = parseFloat(clean);
        }

        if (isNaN(entryVal)) {
          console.error('Failed to parse entry value:', rawValue);
          return;
        }

        // De-duplication check:
        // 1. Check if exact event ID was already processed (strict duplicate)
        if (processedSaleIds.current.has(newEvent.id)) {
          console.log('Duplicate event ID ignored:', newEvent.id);
          return;
        }

        // 2. Check if we already processed this sales_process_id WITH THE SAME value
        const lastProcessedValue = processedProcessValues.current.get(newEvent.sales_process_id);
        if (lastProcessedValue !== undefined && lastProcessedValue === entryVal) {
          console.log('Duplicate sales_process_id with SAME value ignored:', newEvent.sales_process_id, entryVal);
          return;
        }

        // Add to processed trackers
        processedSaleIds.current.add(newEvent.id);
        processedProcessValues.current.set(newEvent.sales_process_id, entryVal);

        // Audio logic moved to queue processing to sync with visual alert


        // Add to Queue
        setAlertQueue(prev => [...prev, {
          id: newEvent.sales_process_id,
          responsible_id: newEvent.seller_id,
          process_type_name: newEvent.process_type,
          paid_amount: entryVal,
          seller_name: formatName(newEvent.seller_name),
          seller_avatar_url: newEvent.seller_avatar_url
        }]);

        // Also refresh data to ensure ranking is up to date
        fetchData();
      })
      .subscribe();

    return () => {
      // salesSubscription.unsubscribe(); // Removed
      newSaleSubscription.unsubscribe();
    };
  }, []); // Removed profiles dependency as it's not needed for the subscription setup itself

  // Process Queue
  useEffect(() => {
    const processNextInQueue = async () => {
      if (alertQueue.length === 0 || isProcessingAlert.current || alertData.isVisible) return;

      isProcessingAlert.current = true;
      const nextSale = alertQueue[0];

      try {
        // Use data directly from the event if available
        const sellerName = (nextSale as any).seller_name ? formatName((nextSale as any).seller_name) : 'Vendedor';

        // Use avatar from event, fallback to profile lookup only if missing
        let sellerAvatar = (nextSale as any).seller_avatar_url;

        if (!sellerAvatar) {
          // Fallback: Find seller avatar from profiles (Local Lookup)
          let sellerProfile = profiles.find(p => p.id === nextSale.responsible_id);

          if (!sellerProfile) {
            // On-Demand Fetch
            const { data } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', nextSale.responsible_id)
              .single();
            if (data) sellerAvatar = data.avatar_url;
          } else {
            sellerAvatar = sellerProfile.avatar_url;
          }
        }

        // Parse amount (ensure it's a number)
        const entryValue = typeof nextSale.paid_amount === 'string'
          ? parseFloat(nextSale.paid_amount)
          : nextSale.paid_amount;

        // Trigger Alert
        setAlertData({
          isVisible: true,
          id: nextSale.id,
          sellerName,
          sellerAvatar,
          processName: nextSale.process_type_name,
          entryValue
        });

        // Play Audio Sequence based on Entry Value (Synced with Visual Alert)
        console.log('--- AUDIO DEBUG START ---');
        console.log('Processing Entry Value:', entryValue, 'Type:', typeof entryValue);

        const audioRule = getAudioRuleByEntryValue(entryValue);
        console.log('Selected Audio Rule:', audioRule);

        if (audioRule) {
          // 1. Play Voice (if exists)
          if (audioRule.voicePath && voicePlayerRef.current) {
            console.log('Attempting to play voice:', audioRule.voicePath);
            voicePlayerRef.current.src = audioRule.voicePath;
            voicePlayerRef.current.volume = 1.0;

            try {
              // Wait for metadata to load to get duration
              await new Promise((resolve, reject) => {
                if (!voicePlayerRef.current) return reject('No player');

                const onLoadedMetadata = () => {
                  voicePlayerRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
                  voicePlayerRef.current?.removeEventListener('error', onError);
                  resolve(true);
                };

                const onError = (e: any) => {
                  voicePlayerRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
                  voicePlayerRef.current?.removeEventListener('error', onError);
                  reject(e);
                };

                voicePlayerRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
                voicePlayerRef.current.addEventListener('error', onError);
                voicePlayerRef.current.load();
              });

              const duration = voicePlayerRef.current.duration;
              console.log('Voice duration:', duration);

              // Calculate bell delay: Duration - 1 second (or 0 if duration < 1)
              // Ensure it's at least 0
              const bellDelay = Math.max(0, (duration - 1) * 1000);
              console.log('Calculated bell delay:', bellDelay);

              // Start voice
              await voicePlayerRef.current.play();
              console.log('Voice playing successfully');

              // Schedule Bell
              if (audioRule.playBell && bellPlayerRef.current) {
                console.log('Scheduling bell in', bellDelay, 'ms');
                setTimeout(async () => {
                  if (bellPlayerRef.current) {
                    console.log('Attempting to play bell: /sounds/Sino.mp3');
                    bellPlayerRef.current.src = '/sounds/Sino.mp3';
                    bellPlayerRef.current.volume = 1.0;
                    try {
                      await bellPlayerRef.current.play();
                      console.log('Bell playing successfully');
                    } catch (err) {
                      console.error('Bell play failed:', err);
                    }
                  }
                }, bellDelay);
              }

            } catch (err: any) {
              console.error('Voice play failed:', err);
              // Fallback: Play bell with 3s delay if voice fails
              if (audioRule.playBell && bellPlayerRef.current) {
                setTimeout(() => {
                  if (bellPlayerRef.current) {
                    bellPlayerRef.current.src = '/sounds/Sino.mp3';
                    bellPlayerRef.current.play().catch(e => console.error('Bell fallback failed', e));
                  }
                }, 3000);
              }
            }
          } else {
            // No voice, play bell with 3s delay
            if (audioRule.playBell && bellPlayerRef.current) {
              setTimeout(() => {
                if (bellPlayerRef.current) {
                  bellPlayerRef.current.src = '/sounds/Sino.mp3';
                  bellPlayerRef.current.play().catch(e => console.error('Bell only failed', e));
                }
              }, 3000);
            }
          }
        } else {
          console.warn('No audio rule found for value:', entryValue);
        }
        console.log('--- AUDIO DEBUG END ---');

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
      name: formatName(profile.full_name || 'Desconhecido'),
      avatar: profile.avatar_url,
      deals: salesBySeller[profile.id] || 0,
      team: profile.team
    })).sort((a, b) => b.deals - a.deals);

    // Fixed Teams List
    const KNOWN_TEAMS = ['Titans', 'Phoenix', 'Premium', 'Diamond', 'Legacy Global'];

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

      let teamName = seller.team;
      if (teamName === 'Titãs') teamName = 'Titans';
      if (teamName === 'Canadá' || teamName === 'Canada') teamName = 'Diamond';

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
        .filter(m => m.processes > 0)
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
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Ranking List */}
        <div className="col-span-3 h-full animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <RankingList sellers={processedData.sellers} />
        </div>

        {/* Center Column: Logo, Podium, KPI */}
        <div className="col-span-6 h-full flex flex-col relative py-4" style={{ animationDelay: '0.2s' }}>

          {/* 1. Logo & Name (Top) */}
          <div className="flex-none flex flex-col items-center justify-start relative z-20 pt-6">
            <div className="w-48 h-48 relative mb-2">
              <img src="/logo-global-one.png" alt="Global One Center" className="w-full h-full object-contain relative z-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest text-glow-accent text-center drop-shadow-lg">
              GLOBAL ONE CENTER
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
            <Podium winners={processedData.sellers.slice(0, 3).map((s, i) => ({
              id: s.id,
              name: s.name,
              amount: s.deals,
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

        {/* Test Audio Button */}
        <button
          onClick={() => {
            const testValues = [500, 1500, 2500, 5000];
            const testValue = testValues[Math.floor(Math.random() * testValues.length)];

            // Test Audio Logic
            const audioRule = getAudioRuleByEntryValue(testValue);
            if (audioRule) {
              console.log('Testing Audio Sequence for:', testValue, audioRule);

              if (audioRule.voicePath && voicePlayerRef.current) {
                voicePlayerRef.current.src = audioRule.voicePath;
                voicePlayerRef.current.load();
                voicePlayerRef.current.play().catch(e => console.error('Error playing voice:', e));
              }

              if (audioRule.playBell && bellPlayerRef.current) {
                setTimeout(() => {
                  if (bellPlayerRef.current) {
                    bellPlayerRef.current.src = '/sounds/Sino.mp3';
                    bellPlayerRef.current.play().catch(e => console.error('Error playing bell:', e));
                  }
                }, audioRule.bellDelay);
              }
            } else {
              console.log(`No specific rule for value: ${testValue}. Playing default.`);
              if (bellPlayerRef.current) {
                bellPlayerRef.current.src = '/sounds/Sino.mp3';
                bellPlayerRef.current.play().catch(e => console.error('Error playing default audio:', e));
              }
            }
          }}
          className="group flex items-center gap-3 px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
          title="Testar Áudio"
        >
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0">
            Testar Áudio
          </span>
          <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
            🔊
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

            // Play audio for test alert too
            const audioRule = getAudioRuleByEntryValue(testValue);
            if (audioRule) {
              if (audioRule.voicePath && voicePlayerRef.current) {
                voicePlayerRef.current.src = audioRule.voicePath;
                voicePlayerRef.current.load();
                voicePlayerRef.current.play().catch(e => console.error(e));
              }
              if (audioRule.playBell && bellPlayerRef.current) {
                setTimeout(() => {
                  if (bellPlayerRef.current) {
                    bellPlayerRef.current.src = '/sounds/Sino.mp3';
                    bellPlayerRef.current.play().catch(e => console.error(e));
                  }
                }, audioRule.bellDelay);
              }
            }

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
        saleId={alertData.id}
        sellerName={alertData.sellerName}
        sellerAvatar={alertData.sellerAvatar}
        processName={alertData.processName}
        entryValue={alertData.entryValue}
        onComplete={handleAlertComplete}
      />

      {/* Hidden Audio Elements */}
      <audio ref={voicePlayerRef} className="hidden" />
      <audio ref={bellPlayerRef} className="hidden" />
    </DashboardLayout>
  );
};

function App() {
  return (
    <DashboardContent />
  );
}

export default App;
