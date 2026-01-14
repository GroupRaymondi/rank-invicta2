import React from 'react';
import { Bell } from 'lucide-react';


interface SalesAlertProps {
    isVisible?: boolean;
    sellerName?: string;
    sellerAvatar?: string;
    processName?: string;
    entryValue?: number;

    onComplete?: () => void;
}

export const SalesAlert: React.FC<SalesAlertProps> = ({ isVisible = false, sellerName, sellerAvatar, processName, entryValue, onComplete }) => {
    React.useEffect(() => {
        if (isVisible) {
            // Play rocket sound
            const audio = new Audio('/rocket-sound.mp3'); // Placeholder path
            audio.volume = 0.5;
            audio.play().catch(e => console.error("Audio play failed", e));

            // Auto hide after 12 seconds
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 12000);

            return () => {
                clearTimeout(timer);
                audio.pause();
                audio.currentTime = 0;
            };
        }
    }, [isVisible, onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/90 backdrop-blur-md transition-opacity duration-500 pb-10">
            <div className="relative flex flex-col items-center w-full h-full justify-end">

                {/* Rocket Container - Animating Upwards */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center animate-[rocket-fly_12s_ease-in-out_forwards] z-30">
                    {/* Rocket Image */}
                    <img
                        src="/rocket-custom.png"
                        alt="Rocket"
                        className="w-96 h-auto drop-shadow-[0_0_50px_rgba(14,165,233,0.8)] mb-4"
                    />

                    {/* Fire/Thrust Effect (Optional visual enhancement) */}
                    <div className="w-4 h-20 bg-orange-500 blur-xl animate-pulse absolute bottom-10 opacity-80"></div>
                </div>

                {/* Content Card - Fades in and stays or moves slightly */}
                <div className="relative z-40 flex flex-col items-center animate-[fade-in-up_1s_ease-out_0.5s_forwards] opacity-0 mb-20">

                    {/* Avatar */}
                    <div className="relative mb-6">
                        <div className="w-40 h-40 rounded-full border-4 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.6)] overflow-hidden bg-gray-800">
                            {sellerAvatar ? (
                                <img src={sellerAvatar} alt={sellerName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white">
                                    {sellerName?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black text-sm font-black px-6 py-1.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                            Nova Venda
                        </div>
                    </div>

                    {/* Seller Name */}
                    <h2 className="text-6xl font-black text-white uppercase tracking-tighter text-glow drop-shadow-2xl mb-8 text-center">
                        {sellerName}
                    </h2>

                    {/* Details Row: Process & Value */}
                    <div className="flex items-center gap-8 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm shadow-2xl">

                        {/* Process Name */}
                        {processName && (
                            <div className="flex flex-col items-center px-6 border-r border-white/10">
                                <span className="text-sm text-blue-300 uppercase tracking-widest font-bold mb-1">Processo</span>
                                <span className="text-3xl text-white font-bold tracking-wide uppercase">{processName}</span>
                            </div>
                        )}

                        {/* Entry Value */}
                        {entryValue !== undefined && (
                            <div className="flex flex-col items-center px-6">
                                <span className="text-sm text-green-400 uppercase tracking-widest font-bold mb-1">Entrada</span>
                                <span className="text-4xl text-green-400 font-black tracking-widest drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entryValue)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
                </div>
            </div>

            {/* Global Styles for Custom Keyframes if not in Tailwind config */}
            <style>{`
                @keyframes rocket-fly {
                    0% { transform: translateY(100vh) translateX(-50%); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(-120vh) translateX(-50%); opacity: 1; }
                }
                @keyframes fade-in-up {
                    0% { transform: translateY(50px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
