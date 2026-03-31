'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { runColorCorrection, getAllPresets, COLOR_PRESETS } from '@/lib/color-correction';
import { ColorPresetId, ColorCorrectionResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';

export default function ColorApproval() {
  const config = useProjectStore((s) => s.config);
  const [result, setResult] = useState<ColorCorrectionResult | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ColorPresetId>('clean');
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (config && !result) {
      const clips = useTimelineStore.getState().clips;
      const r = runColorCorrection(clips, config.style);
      setResult(r);
      setSelectedPreset(r.presetId);
    }
  }, [config, result]);

  const presets = getAllPresets();
  const active = COLOR_PRESETS[selectedPreset];

  const handleApprove = () => {
    addMessage('system', `Stage 7 approved. "${active.name}" color grade applied across ${result?.sceneCount ?? 0} scenes.`);
    approveStage('color');
  };

  const handleReject = () => {
    addMessage('system', 'Stage color rejected. Changes reverted.');
    rejectStage('color');
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-color/15 flex items-center justify-center">
          <Palette size={12} strokeWidth={1.5} className="text-stage-color" />
        </div>
        <span className="text-[13px] font-heading font-semibold text-text-primary">Color Correction</span>
      </div>

      {/* Corrections applied */}
      {result && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'White Balance', ok: result.whiteBalanceCorrected },
            { label: 'Exposure', ok: result.exposureNormalized },
            { label: 'Skin Tones', ok: result.skinToneProtected },
            { label: 'Scene Match', ok: result.scenesMatched },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-panel border border-border-default/50">
              <div className={cn('w-1.5 h-1.5 rounded-full', item.ok ? 'bg-accent-green' : 'bg-text-faint')} />
              <span className="text-[10px] text-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Preset picker */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-[1.5px] text-text-muted">Look Preset</label>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all duration-200 cursor-pointer',
                selectedPreset === preset.id
                  ? 'bg-stage-color/5 border-stage-color/25'
                  : 'bg-bg-panel border-border-default hover:border-border-active'
              )}
            >
              <div className={cn('w-3 h-3 rounded-full', selectedPreset === preset.id ? 'bg-stage-color' : 'bg-bg-active')} />
              <div>
                <div className={cn('text-[11px] font-medium', selectedPreset === preset.id ? 'text-text-primary' : 'text-text-muted')}>{preset.name}</div>
                <div className="text-[9px] text-text-faint">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleApprove} className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]">
          <Check size={13} strokeWidth={2} /> Approve Color
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
