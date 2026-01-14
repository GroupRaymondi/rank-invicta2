import React from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


interface SalesAlertProps {
    isVisible?: boolean;
    saleId?: string; // Added saleId
    sellerName?: string;
    sellerAvatar?: string;
    processName?: string;
    entryValue?: number;

    onComplete?: () => void;
}

const Fireworks = () => {
    const particles = Array.from({ length: 200 }); // 200 particles for density
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-30">
            {particles.map((_, i) => {
                // Randomize physics for each particle
                const angle = Math.random() * 360;
                const velocity = Math.random() * 1500 + 500; // Fast explosion
                const x = Math.cos(angle * (Math.PI / 180)) * velocity;
                const y = Math.sin(angle * (Math.PI / 180)) * velocity;
                const size = Math.random() * 6 + 2; // Varied sizes 2px - 8px

                return (
                    <motion.div
                        key={i}
                        initial={{
                            x: 0,
                            y: 0,
                            opacity: 1,
                            scale: 0
                        }}
                        animate={{
                            x: x,
                            y: y + 200, // Add gravity (fall down slightly)
                            opacity: 0,
                            scale: [0, 1.5, 0] // Grow then shrink
                        }}
                        transition={{
                            duration: Math.random() * 2 + 1,
                            ease: "easeOut", // Explosive start
                            delay: Math.random() * 0.2, // Tight burst
                            repeat: Infinity,
                            repeatDelay: 3
                        }}
                        className="absolute rounded-full"
                        style={{
                            width: size,
                            height: size,
                            backgroundColor: ['#FFFFFF', '#FFD700', '#FDB931', '#FFA500', '#FFFFE0'][Math.floor(Math.random() * 5)], // Brighter palette
                            boxShadow: `0 0 ${size * 4}px ${size}px rgba(255, 215, 0, 0.8)` // Intense glow
                        }}
                    />
                );
            })}
        </div>
    );
};

const SideConfetti = () => {
    const particles = Array.from({ length: 75 }); // Increased to 75 particles per side
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {/* Left Side Confetti */}
            {particles.map((_, i) => (
                <motion.div
                    key={`left-${i}`}
                    initial={{
                        x: -50, // Start slightly off-screen left
                        y: 0,   // Start at the bottom (relative to bottom-0 class)
                        opacity: 1,
                        rotate: 0
                    }}
                    animate={{
                        x: Math.random() * (windowWidth * 0.4), // Fly inwards up to 40% of screen
                        y: -windowHeight * 1.2, // Fly UP past the top
                        opacity: 0,
                        rotate: Math.random() * 360 * 4
                    }}
                    transition={{
                        duration: Math.random() * 3 + 4, // Slower, floaty fall
                        ease: "easeOut",
                        delay: Math.random() * 1, // Staggered start
                        repeat: Infinity,
                        repeatDelay: 2
                    }}
                    className="absolute bottom-0 left-0 w-3 h-6 rounded-sm" // Rectangular confetti shape
                    style={{
                        backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'][Math.floor(Math.random() * 6)],
                    }}
                />
            ))}

            {/* Right Side Confetti */}
            {particles.map((_, i) => (
                <motion.div
                    key={`right-${i}`}
                    initial={{
                        x: windowWidth + 50, // Start slightly off-screen right
                        y: 0, // Start at the bottom
                        opacity: 1,
                        rotate: 0
                    }}
                    animate={{
                        x: windowWidth - (Math.random() * (windowWidth * 0.4)), // Fly inwards from right
                        y: -windowHeight * 1.2, // Fly UP past the top
                        opacity: 0,
                        rotate: Math.random() * -360 * 4
                    }}
                    transition={{
                        duration: Math.random() * 3 + 4,
                        ease: "easeOut",
                        delay: Math.random() * 1,
                        repeat: Infinity,
                        repeatDelay: 2
                    }}
                    className="absolute bottom-0 left-0 w-3 h-6 rounded-sm" // Position relative to viewport, but animate x/y
                    style={{
                        backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'][Math.floor(Math.random() * 6)],
                    }}
                />
            ))}
        </div>
    );
};

export const SalesAlert: React.FC<SalesAlertProps> = ({ isVisible = false, saleId, sellerName, sellerAvatar, processName, entryValue, onComplete }) => {
    React.useEffect(() => {
        if (isVisible) {
            console.log('SalesAlert Visible', { saleId, sellerName });
            console.log('SalesAlert Visible', { saleId, sellerName, entryValue });

            // Audio Orchestration
            let voiceFile = '';
            let playVoice = false;

            // Determine audio strategy based on value
            const value = entryValue || 0;

            if (value <= 500) {
                voiceFile = '/ElevenLabs_Vagner.mp3';
                playVoice = true;
            } else if (value >= 501 && value <= 1999) {
                playVoice = false; // Only bell
            } else if (value >= 2000 && value <= 4999) {
                voiceFile = '/ElevenLabs_Vagner_2k.mp3';
                playVoice = true;
            } else if (value >= 5000) {
                voiceFile = '/ElevenLabs_Vagner_5k.mp3';
                playVoice = true;
            }

            const bellAudio = new Audio('/Sino.mp3');
            bellAudio.volume = 0.6;
            bellAudio.loop = true;

            let voiceAudio: HTMLAudioElement | null = null;
            let bellTimeout: NodeJS.Timeout;

            if (playVoice) {
                voiceAudio = new Audio(voiceFile);
                voiceAudio.volume = 1.0;

                // Play voice immediately
                voiceAudio.play().catch(e => console.error("Voice play failed", e));

                // When voice metadata loads, schedule the bell
                voiceAudio.onloadedmetadata = () => {
                    if (!voiceAudio) return;
                    const duration = voiceAudio.duration;
                    if (duration && duration > 1) {
                        const bellDelay = (duration - 1) * 1000; // Start 1s before end
                        bellTimeout = setTimeout(() => {
                            bellAudio.currentTime = 3; // Skip first 3 seconds
                            bellAudio.play().catch(e => console.error("Bell play failed", e));
                        }, bellDelay);
                    } else {
                        // Fallback
                        bellAudio.currentTime = 3;
                        bellAudio.play().catch(e => console.error("Bell play failed", e));
                    }
                };
            } else {
                // Only bell case (501-1999)
                bellAudio.currentTime = 3; // Skip first 3 seconds
                bellAudio.play().catch(e => console.error("Bell play failed", e));
            }

            // Auto hide after 15 seconds (12s rocket + 3s hold)
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 15000);

            return () => {
                clearTimeout(timer);
                if (bellTimeout) clearTimeout(bellTimeout);

                // Cleanup audios
                if (voiceAudio) {
                    voiceAudio.pause();
                    voiceAudio.currentTime = 0;
                }
                bellAudio.pause();
                bellAudio.currentTime = 0;
            };
        }
    }, [isVisible, onComplete, saleId, sellerName]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="sales-alert-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
                >
                    <div className="relative flex flex-col items-center w-full h-full justify-center">

                        {/* Fireworks Effect - Keyed to restart on new sale */}
                        <Fireworks key={saleId ? `fireworks-${saleId}` : `fireworks-${Date.now()}`} />

                        {/* Side Confetti - Celebration! */}
                        <SideConfetti key={saleId ? `confetti-${saleId}` : `confetti-${Date.now()}`} />

                        {/* Rocket Container - Animating Upwards with Framer Motion */}
                        <motion.div
                            key={saleId ? `rocket-${saleId}` : `rocket-${Date.now()}`}
                            initial={{ y: "100vh" }}
                            animate={{ y: "-150vh" }}
                            exit={{ opacity: 0 }}
                            transition={{
                                y: { duration: 12, ease: "easeInOut" },
                                default: { duration: 0.5 }
                            }}
                            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-50"
                        >
                            {/* Rocket Image */}
                            <img
                                src="/rocket-custom.png"
                                alt="Rocket"
                                className="w-96 h-auto drop-shadow-[0_0_50px_rgba(14,165,233,0.8)] mb-4"
                            />

                            {/* Fire/Thrust Effect */}
                            <div className="w-4 h-20 bg-orange-500 blur-xl animate-pulse absolute bottom-10 opacity-80"></div>
                        </motion.div>

                        {/* Content Card - Fades in */}
                        <motion.div
                            key={saleId ? `content-${saleId}` : `content-${Date.now()}`} // Force re-render for content too
                            initial={{ opacity: 0, y: "100vh" }} // Start from bottom of screen
                            animate={{ opacity: 1, y: 0 }} // Slide up to center
                            exit={{ opacity: 0, y: -50 }} // Slide up slightly when leaving
                            transition={{ delay: 0.2, duration: 0.8, type: "spring", bounce: 0.3 }} // Smooth spring animation
                            className="relative z-40 flex flex-col items-center"
                        >

                            {/* Avatar */}
                            <div className="relative mb-10">
                                <div className="w-72 h-72 rounded-full border-8 border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.6)] overflow-hidden bg-gray-800">
                                    {sellerAvatar ? (
                                        <img src={sellerAvatar} alt={sellerName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-8xl font-bold text-white">
                                            {sellerName?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black text-2xl font-black px-10 py-3 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                                    Nova Venda
                                </div>
                            </div>

                            {/* Seller Name */}
                            <h2 className="text-8xl md:text-9xl font-black text-white uppercase tracking-tighter text-glow drop-shadow-2xl mb-12 text-center max-w-7xl px-4 leading-tight">
                                {sellerName}
                            </h2>

                            {/* Details Row: Process & Value */}
                            <div className="flex items-center gap-16 bg-white/5 border border-white/10 rounded-[3rem] p-10 backdrop-blur-sm shadow-2xl">

                                {/* Process Name */}
                                {processName && (
                                    <div className="flex flex-col items-center px-10 border-r border-white/10">
                                        <span className="text-xl text-blue-300 uppercase tracking-widest font-bold mb-3">Processo</span>
                                        <span className="text-6xl text-white font-bold tracking-wide uppercase">{processName}</span>
                                    </div>
                                )}

                                {/* Entry Value */}
                                {entryValue !== undefined && (
                                    <div className="flex flex-col items-center px-10">
                                        <span className="text-xl text-green-400 uppercase tracking-widest font-bold mb-3">Entrada</span>
                                        <span className="text-6xl text-green-400 font-black tracking-widest drop-shadow-[0_0_25px_rgba(34,197,94,0.5)]">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entryValue)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Background Effects */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
                            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
