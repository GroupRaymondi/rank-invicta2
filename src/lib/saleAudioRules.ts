export type AudioKey =
    | 'ElevenLabs_Vagner'
    | 'Sino'
    | 'ElevenLabs_Vagner_1k'
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
        voicePath: '/Sininho.mp3',
        playBell: false,
        bellDelay: 0
    },
    {
        minInclusive: 1000,
        maxInclusive: Number.MAX_SAFE_INTEGER,
        voicePath: '/Foguete.mp3',
        playBell: false,
        bellDelay: 0
    }
];

export function getAudioRuleByEntryValue(entryValue: number): AudioRule | null {
    const rule = AUDIO_RULES.find(
        r => entryValue >= r.minInclusive && entryValue <= r.maxInclusive
    );
    return rule ?? null;
}

