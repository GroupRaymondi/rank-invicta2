import React from 'react';
import { Bell } from 'lucide-react';


interface SalesAlertProps {
    isVisible?: boolean;
    sellerName?: string;
    sellerAvatar?: string;
    processName?: string;
    entryValue?: number;
    value?: number; // Keeping for backward compatibility or total value if needed
    onComplete?: () => void;
}

export const SalesAlert: React.FC<SalesAlertProps> = ({ isVisible = false, sellerName, sellerAvatar, processName, entryValue, value, onComplete }) => {
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-500">
            <div className="relative flex flex-col items-center animate-bounce duration-[3000ms]">
                <div className="relative flex flex-col items-center">
                    <div className="absolute -inset-20 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>

                    {/* Custom Rocket Image */}
                    <img
                        src="/rocket-custom.png"
                        alt="Rocket"
                        className="w-80 h-auto relative z-10 drop-shadow-[0_0_50px_rgba(14,165,233,0.8)] animate-rocket-launch mb-8"
                    />

                    {/* Seller Avatar - Positioned centrally or below rocket */}
                    {sellerAvatar ? (
                        <div className="relative z-20 -mt-16 mb-6">
                            <div className="w-32 h-32 rounded-full border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.6)] overflow-hidden">
                                <img src={sellerAvatar} alt={sellerName} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                Vendedor
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-20 -mt-16 mb-6 w-32 h-32 rounded-full bg-gray-800 border-4 border-gray-600 flex items-center justify-center text-4xl font-bold text-white">
                            {sellerName?.charAt(0)}
                        </div>
                    )}
                </div>

                <h2 className="text-6xl font-black text-white mt-4 uppercase tracking-tighter text-glow animate-pulse">
                    Nova Venda!
                </h2>

                <div className="mt-6 text-center space-y-4 relative z-20">
                    <p className="text-5xl text-white font-bold tracking-wide drop-shadow-lg">{sellerName}</p>

                    {processName && (
                        <p className="text-3xl text-blue-300 font-bold tracking-wider uppercase drop-shadow-md">{processName}</p>
                    )}

                    {entryValue !== undefined && (
                        <div className="inline-block bg-green-500/20 border border-green-500/40 rounded-full px-12 py-5 shadow-[0_0_40px_rgba(34,197,94,0.5)] mt-6 transform scale-110">
                            <p className="text-5xl text-green-400 font-black tracking-widest">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entryValue)}
                            </p>
                            <p className="text-sm text-green-500/80 uppercase tracking-[0.3em] font-bold mt-2">Valor de Entrada</p>
                        </div>
                    )}
                </div>

                <div className="absolute top-0 right-0 -mt-20 -mr-20">
                    <Bell className="w-24 h-24 text-yellow-400 animate-ping-slow drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
                </div>
            </div>

            {/* Confetti or Particles could be added here */}
        </div>
    );
};
