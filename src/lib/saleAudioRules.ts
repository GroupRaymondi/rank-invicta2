export type AudioKey =
    | 'ElevenLabs_Vagner'
    | 'Sino'
    | 'ElevenLabs_Vagner_2k'
    | 'ElevenLabs_Vagner_5k'
    | null;

interface AudioRule {
    minInclusive: number;
    maxInclusive: number;
    audioKey: AudioKey;
    audioPath: string;
}

const AUDIO_RULES: AudioRule[] = [
    {
        minInclusive: 0,
        maxInclusive: 999,
        audioKey: 'ElevenLabs_Vagner',
        audioPath: '/sounds/ElevenLabs_Vagner.mp3'
    },
    {
        minInclusive: 1000,
        maxInclusive: 1999,
        audioKey: 'Sino',
        audioPath: '/sounds/Sino.mp3'
    },
    {
        minInclusive: 2000,
        maxInclusive: 2499,
        audioKey: 'ElevenLabs_Vagner_2k',
        audioPath: '/sounds/ElevenLabs_Vagner_2k.mp3'
    },
    {
        minInclusive: 2500,
        maxInclusive: 1000000, // Increased max to cover high values
        audioKey: 'ElevenLabs_Vagner_5k',
        audioPath: '/sounds/ElevenLabs_Vagner_5k.mp3'
    }
];

export function getAudioPathByEntryValue(entryValue: number): string | null {
    const rule = AUDIO_RULES.find(
        r => entryValue >= r.minInclusive && entryValue <= r.maxInclusive
    );
    return rule?.audioPath ?? null;
}

export function getAudioKeyByEntryValue(entryValue: number): AudioKey {
    const rule = AUDIO_RULES.find(
        r => entryValue >= r.minInclusive && entryValue <= r.maxInclusive
    );
    return rule?.audioKey ?? null;
}
