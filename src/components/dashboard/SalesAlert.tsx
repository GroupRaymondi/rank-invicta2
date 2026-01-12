import React from 'react';
import { Rocket, Bell } from 'lucide-react';


interface SalesAlertProps {
    isVisible?: boolean;
    sellerName?: string;
    value?: number;
    onComplete?: () => void;
}

export const SalesAlert: React.FC<SalesAlertProps> = ({ isVisible = false, sellerName, value, onComplete }) => {
    React.useEffect(() => {
        if (isVisible) {
            // Play rocket sound
            const audio = new Audio('/rocket-sound.mp3'); // Placeholder path
            audio.volume = 0.5;
            audio.play().catch(e => console.error("Audio play failed", e));

            // Auto hide after 10 seconds
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 10000);

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
            <div className="relative flex flex-col items-center animate-bounce duration-[2000ms]">
                <div className="relative">
                    <div className="absolute -inset-10 bg-primary/40 rounded-full blur-3xl animate-pulse"></div>
                    <Rocket className="w-48 h-48 text-primary relative z-10 drop-shadow-[0_0_30px_rgba(14,165,233,1)] animate-rocket-launch" />
                </div>

                <h2 className="text-7xl font-black text-white mt-12 uppercase tracking-tighter text-glow animate-pulse">
                    Nova Venda!
                </h2>

                <div className="mt-8 text-center space-y-4">
                    <p className="text-4xl text-white font-bold tracking-wide drop-shadow-lg">{sellerName}</p>
                    {value !== undefined && (
                        <div className="inline-block bg-green-500/20 border border-green-500/40 rounded-full px-8 py-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            <p className="text-3xl text-green-400 font-black tracking-widest">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            </p>
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
