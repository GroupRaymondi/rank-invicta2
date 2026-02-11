import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { formatName } from '../lib/utils';
import { KPICards } from '../components/dashboard/KPICards';
import { RankingList } from '../components/dashboard/RankingList';
import { TeamGrid, type Team } from '../components/dashboard/TeamGrid';
import { SalesAlert } from '../components/dashboard/SalesAlert';
import { Podium } from '../components/dashboard/Podium';
import { supabase } from '../lib/supabase';
import { Loader2, Maximize2, Rocket, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAudioRuleByEntryValue } from '../lib/saleAudioRules';

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
    alerts?: number;
    seller_name?: string;
    avatar_url?: string;
    team?: string;
}

interface SaleAlertData {
    isVisible: boolean;
    id?: string;
    sellerName?: string;
    sellerAvatar?: string;
    processName?: string;
    entryValue?: number;
}

export const PublicDashboard = () => {
    const navigate = useNavigate();
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
                // Fetch Profiles (All System Users)
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, team, status');

                if (profilesError) {
                    console.error('Error fetching profiles:', profilesError);
                    throw profilesError;
                }

                console.log('All System Profiles:', profilesData);
                setProfiles(profilesData || []);

                // Fetch Ranking from RPC
                console.log('Fetching weekly ranking from RPC...');
                const { data: rankingData, error: rankingError } = await supabase
                    .rpc('get_weekly_ranking_for_date', {
                        // Using undefined/null lets the RPC calc the correct NY date
                        // or pass explicit date if needed
                    });

                if (rankingError) {
                    console.error('Error fetching ranking from RPC:', rankingError);
                    throw rankingError;
                }

                console.log('RPC Ranking Data:', rankingData);

                // Map RPC data to MonthlySales format
                const salesWithAlerts = (rankingData || []).map((item: any) => {
                    const deals = Number(item.total_lives || 0);
                    return {
                        seller_id: item.seller_id,
                        deals_closed: deals,
                        total_sales: Number(item.total_entry_value || 0),
                        alerts: deals > 0 ? 0 : 1,
                        seller_name: item.seller_name,
                        avatar_url: item.avatar_url,
                        team: item.team
                    };
                });

                setSales(salesWithAlerts);
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
                console.log('REALTIME EVENT RECEIVED:', payload);

                // Always refresh data to ensure ranking/KPI is up to date
                fetchData();

                // If it's a DELETE event, stop here.
                if (payload.eventType === 'DELETE') {
                    console.log('Event is DELETE. Skipping alert.');
                    return;
                }

                // Only proceed for INSERT or UPDATE events
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

                console.log(`Processing ${payload.eventType} event:`, newEvent);

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
                // ONLY block if it's an INSERT (replaying same event). 
                // If it's UPDATE, we allow re-processing (assuming value changed, checked below)
                if (payload.eventType === 'INSERT' && processedSaleIds.current.has(newEvent.id)) {
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

                console.log('Queueing Alert for:', newEvent.seller_name, entryVal);

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
            .subscribe((status) => {
                console.log('REALTIME SUBSCRIPTION STATUS:', status);
            });

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
                // Use avatar from event, fallback to profile lookup only if missing
                let sellerAvatar = (nextSale as any).seller_avatar_url;
                let sellerName = (nextSale as any).seller_name ? formatName((nextSale as any).seller_name) : null;

                if (!sellerAvatar || !sellerName) {
                    // Fallback: Find seller profile (Local Lookup)
                    let sellerProfile = profiles.find(p => p.id === nextSale.responsible_id);

                    if (!sellerProfile) {
                        // Skip DB fetch for test IDs to avoid 400 errors
                        if (nextSale.responsible_id.startsWith('test-')) {
                            console.warn('Skipping DB fetch for test ID:', nextSale.responsible_id);
                            // Use fallback name if not already set
                            if (!sellerName) sellerName = 'Vendedor Teste';
                        } else {
                            // On-Demand Fetch
                            const { data } = await supabase
                                .from('profiles')
                                .select('full_name, avatar_url')
                                .eq('id', nextSale.responsible_id)
                                .single();

                            if (data) {
                                if (!sellerAvatar) sellerAvatar = data.avatar_url;
                                if (!sellerName) sellerName = formatName(data.full_name);
                            }
                        }
                    } else {
                        if (!sellerAvatar) sellerAvatar = sellerProfile.avatar_url;
                        if (!sellerName) sellerName = formatName(sellerProfile.full_name);
                    }
                }

                // Final fallback if still nothing
                if (!sellerName) sellerName = 'Vendedor';

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
        // Use sales directly as it comes from RPC which is the source of truth
        const sellers = sales.map(sale => ({
            id: sale.seller_id,
            name: formatName(sale.seller_name || 'Desconhecido'),
            avatar: sale.avatar_url,
            deals: sale.deals_closed,
            alerts: sale.alerts,
            team: sale.team
        })).sort((a, b) => b.deals - a.deals);

        // Fixed Teams List
        const KNOWN_TEAMS = ['Titans', 'Phoenix', 'Premium', 'Diamond', 'Legacy Global', 'Imperium', 'Invictus', 'Elite', 'Falcons', 'Blessed'];

        // Helper to normalize keys (trim + lowercase)
        const normalize = (s: string) => s.trim().toLowerCase();

        // Create Teams Data
        // Key = normalized name, Value = Team Object
        const teamsMap: Record<string, Team> = {};

        // Initialize known teams
        KNOWN_TEAMS.forEach(teamName => {
            const key = normalize(teamName);
            teamsMap[key] = {
                id: key,
                name: teamName, // Canonical Display Name
                amount: 0,
                members: 0,
                rank: 0,
                processes: 0,
                topMembers: []
            };
        });

        sellers.forEach(seller => {
            if (!seller.team) return;

            let rawTeamName = seller.team.trim();
            // Handle known aliases
            if (rawTeamName === 'Titãs') rawTeamName = 'Titans';
            if (rawTeamName === 'Canadá' || rawTeamName === 'Canada') rawTeamName = 'Diamond';

            const key = normalize(rawTeamName);

            if (!teamsMap[key]) {
                teamsMap[key] = {
                    id: key,
                    name: rawTeamName,
                    amount: 0,
                    members: 0,
                    rank: 0,
                    processes: 0,
                    topMembers: []
                };
            }

            const team = teamsMap[key];
            team.members += 1;
            team.processes += seller.deals;
            team.topMembers.push({ name: seller.name, processes: seller.deals });
        });

        const teams = Object.values(teamsMap)
            // Filter: remove teams with 0 members as requested
            .filter(team => team.members > 0)
            .sort((a, b) => b.processes - a.processes)
            .map((team, index) => ({
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

                {/* Admin Access Button */}
                <button
                    onClick={() => navigate('/login')}
                    className="group flex items-center gap-3 px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                    title="Acesso Admin"
                >
                    <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0">
                        Admin
                    </span>
                    <div className="p-1 rounded-lg bg-gray-500/20 text-gray-400 group-hover:bg-gray-500 group-hover:text-white transition-all duration-300">
                        <Settings className="w-5 h-5" />
                    </div>
                </button>

                {/* Test Single Event Button (Red Rocket) */}
                <button
                    onClick={async () => {
                        // Fallback profile if no profiles are loaded
                        let profile;

                        if (profiles.length > 0) {
                            // Pick a random profile
                            profile = profiles[Math.floor(Math.random() * profiles.length)];
                        } else {
                            // Create a mock profile if none exist
                            profile = {
                                id: 'test-fallback-id',
                                full_name: 'Vendedor Teste',
                                avatar_url: null,
                                team: 'Test Team'
                            };
                            console.log('Using fallback test profile as no profiles are loaded');
                        }

                        const testValue = [500, 1500, 2500, 5000][Math.floor(Math.random() * 4)];
                        const processName = ['VISTO T', 'GREEN CARD', 'CIDADANIA', 'CONSULTORIA'][Math.floor(Math.random() * 4)];

                        console.log('Triggering single test alert for:', profile.full_name);

                        setAlertQueue(prev => [...prev, {
                            id: `test-single-${Date.now()}-${profile.id}`,
                            responsible_id: profile.id,
                            created_by: profile.id,
                            process_type_name: processName,
                            paid_amount: testValue,
                            seller_name: formatName(profile.full_name),
                            seller_avatar_url: profile.avatar_url || undefined
                        }]);
                    }}
                    className="group flex items-center gap-3 px-4 py-3 bg-red-500/80 hover:bg-red-600 text-white rounded-xl border border-white/10 hover:border-white/20 backdrop-blur-md transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                    title="Evento Teste"
                >
                    <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0">
                        Evento Teste
                    </span>
                    <div className="p-1 rounded-lg bg-white/20 group-hover:bg-white/30 transition-all duration-300">
                        <Rocket className="w-5 h-5" />
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
