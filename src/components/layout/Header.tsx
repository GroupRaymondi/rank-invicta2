
import React from 'react';


export const Header: React.FC = () => {
    return (
        <header className="sticky top-0 z-50 flex items-center justify-between py-4 px-6 rounded-2xl transition-all duration-300 glass-strong shadow-lg translate-y-2">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img src="/logo.png" alt="Invicta Consulting" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(14,165,233,0.3)] relative z-10" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-glow">
                        Invicta Consulting
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1.5 bg-red-500/10 px-3 py-0.5 rounded-full border border-red-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Ao Vivo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Empty or User Profile */}
            <div className="flex items-center gap-4">
                {/* Clock removed as requested */}
            </div>
        </header>
    );
};
