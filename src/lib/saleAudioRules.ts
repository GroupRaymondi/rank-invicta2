export type AudioKey =
    | 'ElevenLabs_Vagner'
    | 'Sino'
    | 'ElevenLabs_Vagner_2k'
    | 'ElevenLabs_Vagner_5k'
    | null;

export interface AudioRule {
    minInclusive: number;
    maxInclusive: number;
    voicePath: string | null;
    playBell: boolean;
    bellDelay: number; // in milliseconds
}

const AUDIO_RULES: AudioRule[] = [
    {
        minInclusive: 0,
        maxInclusive: 999,
        voicePath: '/sounds/ElevenLabs_Vagner.mp3',
        playBell: true,
        bellDelay: 3000
    },
    {
        minInclusive: 1000,
        maxInclusive: 1999,
        voicePath: null, // No voice
        playBell: true,
        bellDelay: 0 // Immediate
    },
    {
        minInclusive: 2000,
        maxInclusive: 2999,
        voicePath: '/sounds/ElevenLabs_Vagner_2k.mp3',
        playBell: true,
        bellDelay: 3000
    },
    {
        minInclusive: 3000,
        maxInclusive: 1000000,
        voicePath: '/sounds/ElevenLabs_Vagner_5k.mp3',
        playBell: true,
        bellDelay: 3000
    }
];

export function getAudioRuleByEntryValue(entryValue: number): AudioRule | null {
    const rule = AUDIO_RULES.find(
        r => entryValue >= r.minInclusive && entryValue <= r.maxInclusive
    );
    return rule ?? null;
}

