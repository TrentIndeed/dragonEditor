'use client';

import { useEffect } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import { Check, AudioLines, Volume2, Radio, ShieldCheck } from 'lucide-react';

export default function AudioApproval() {
  const config = useAudioStore((s) => s.config);
  const analysis = useAudioStore((s) => s.analysis);
  const changes = useAudioStore((s) => s.changes);
  const isProcessed = useAudioStore((s) => s.isProcessed);
  const processAudio = useAudioStore((s) => s.processAudio);
  const toggleNoiseReduction = useAudioStore((s) => s.toggleNoiseReduction);
  const toggleAudioDucking = useAudioStore((s) => s.toggleAudioDucking);
  const setNoiseReductionLevel = useAudioStore((s) => s.setNoiseReductionLevel);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (!isProcessed) processAudio();
  }, [isProcessed, processAudio]);

  const handleApprove = () => {
    addMessage('system', `Stage 2 approved. ${changes.length} audio adjustments applied.`);
    approveStage('audio');
  };

  const handleReject = () => {
    addMessage('system', 'Stage audio rejected. Changes reverted.');
    rejectStage('audio');
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-audio/15 flex items-center justify-center">
          <AudioLines size={12} strokeWidth={1.5} className="text-stage-audio" />
        </div>
        <div>
          <span className="text-[13px] font-heading font-semibold text-text-primary">Audio Setup</span>
          <span className="text-[11px] text-text-muted ml-2">Review Changes</span>
        </div>
      </div>

      {/* Analysis results */}
      {analysis && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Peak Level', value: `${analysis.peakLevel} dB`, ok: !analysis.clipping },
            { label: 'Avg Level', value: `${analysis.avgLevel} dB`, ok: true },
            { label: 'Noise Floor', value: `${analysis.noiseFloor} dB`, ok: analysis.noiseFloor < -40 },
            { label: 'Gain Applied', value: `+${analysis.suggestedGain} dB`, ok: true },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-bg-panel border border-border-default/50">
              <div className={cn('w-1.5 h-1.5 rounded-full', m.ok ? 'bg-accent-green' : 'bg-accent-red')} />
              <div>
                <div className="text-[9px] font-mono text-text-faint uppercase">{m.label}</div>
                <div className="text-[12px] font-mono text-text-primary">{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Changes list */}
      <div className="space-y-1.5">
        {changes.map((change, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]">
            <Check size={11} strokeWidth={2} className="text-accent-green mt-0.5 shrink-0" />
            <span className="text-text-secondary">{change}</span>
          </div>
        ))}
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-[1.5px] text-text-muted">Settings</label>
        <div className="space-y-1.5">
          <ToggleRow
            label="Noise Reduction"
            icon={<ShieldCheck size={12} strokeWidth={1.5} />}
            enabled={config.noiseReduction}
            onToggle={toggleNoiseReduction}
          />
          {config.noiseReduction && (
            <div className="flex gap-1.5 ml-7">
              {(['light', 'medium', 'heavy'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setNoiseReductionLevel(level)}
                  className={cn(
                    'h-[22px] px-2.5 rounded text-[9px] font-mono uppercase border transition-all duration-200 cursor-pointer',
                    config.noiseReductionLevel === level
                      ? 'bg-stage-audio/10 border-stage-audio/25 text-stage-audio'
                      : 'bg-bg-panel border-border-default text-text-faint hover:text-text-muted'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          )}
          <ToggleRow
            label="Audio Ducking"
            icon={<Volume2 size={12} strokeWidth={1.5} />}
            enabled={config.audioDucking}
            onToggle={toggleAudioDucking}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleApprove}
          className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]"
        >
          <Check size={13} strokeWidth={2} />
          Approve Audio
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}

function ToggleRow({ label, icon, enabled, onToggle }: { label: string; icon: React.ReactNode; enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2.5 w-full cursor-pointer group">
      <div className={cn(
        'w-7 h-4 rounded-full relative transition-colors duration-200',
        enabled ? 'bg-stage-audio/30' : 'bg-bg-active'
      )}>
        <div className={cn(
          'absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200',
          enabled ? 'left-3.5 bg-stage-audio' : 'left-0.5 bg-text-faint'
        )} />
      </div>
      <span className="text-text-muted group-hover:text-text-secondary transition-colors duration-200">{icon}</span>
      <span className={cn('text-[11px] font-medium', enabled ? 'text-text-primary' : 'text-text-muted')}>{label}</span>
    </button>
  );
}
