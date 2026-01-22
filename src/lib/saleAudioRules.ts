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
        maxInclusive: 999.99,
        voicePath: '/ElevenLabs_Vagner.mp3',
        playBell: true,
        bellDelay: 0 // Ignored, calculated dynamically
    },
    {
        minInclusive: 1000,
        maxInclusive: 1999.99,
        voicePath: '/ElevenLabs_vagner_1k.mp3',
        playBell: true,
        bellDelay: 0 // Ignored, calculated dynamically
    },
    {
        minInclusive: 2000,
        maxInclusive: 4999.99,
        voicePath: '/ElevenLabs_Vagner_2k.mp3',
        playBell: true,
        bellDelay: 0 // Ignored, calculated dynamically
    },
    {
        minInclusive: 5000,
        maxInclusive: Number.MAX_SAFE_INTEGER,
        voicePath: '/ElevenLabs_Vagner_5k.mp3',
        playBell: true,
        bellDelay: 0 // Ignored, calculated dynamically
    }
];

export function getAudioRuleByEntryValue(entryValue: number): AudioRule | null {
    const rule = AUDIO_RULES.find(
        r => entryValue >= r.minInclusive && entryValue <= r.maxInclusive
    );
    return rule ?? null;
}

