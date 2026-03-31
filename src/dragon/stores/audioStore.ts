import { create } from 'zustand';
import { AudioSetupConfig, AudioAnalysis } from '@/lib/types';
import { runAudioSetup, AudioSetupResult, DEFAULT_AUDIO_CONFIG } from '@/lib/audio-setup';
import { useTimelineStore } from './timelineStore';

interface AudioStore {
  config: AudioSetupConfig;
  analysis: AudioAnalysis | null;
  changes: string[];
  isProcessed: boolean;
  processAudio: () => void;
  setNoiseReductionLevel: (level: 'light' | 'medium' | 'heavy') => void;
  toggleNoiseReduction: () => void;
  toggleAudioDucking: () => void;
  reset: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  config: DEFAULT_AUDIO_CONFIG,
  analysis: null,
  changes: [],
  isProcessed: false,

  processAudio: () => {
    const clips = useTimelineStore.getState().clips;
    const result = runAudioSetup(clips);
    set({
      config: result.config,
      analysis: result.analysis,
      changes: result.changes,
      isProcessed: true,
    });
  },

  setNoiseReductionLevel: (level) => set((s) => ({
    config: { ...s.config, noiseReductionLevel: level },
  })),

  toggleNoiseReduction: () => set((s) => ({
    config: { ...s.config, noiseReduction: !s.config.noiseReduction },
  })),

  toggleAudioDucking: () => set((s) => ({
    config: { ...s.config, audioDucking: !s.config.audioDucking },
  })),

  reset: () => set({
    config: DEFAULT_AUDIO_CONFIG,
    analysis: null,
    changes: [],
    isProcessed: false,
  }),
}));
