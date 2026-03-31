'use client';

import { useState, useCallback } from 'react';
import { STAGE_SETTINGS, StageSetting } from '@/lib/stage-settings';
import { PipelineStageId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Play, X } from 'lucide-react';

interface StageSettingsProps {
  stageId: PipelineStageId;
  onRun: (settings: Record<string, any>) => void;
  onClose: () => void;
}

export default function StageSettings({ stageId, onRun, onClose }: StageSettingsProps) {
  const config = STAGE_SETTINGS[stageId];
  if (!config) return null;

  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    for (const s of config.settings) defaults[s.key] = s.default;
    return defaults;
  });

  const setValue = useCallback((key: string, value: any) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-active">
        <div>
          <h3 className="text-[16px] font-semibold text-text-primary">{config.title}</h3>
          <p className="text-[13px] text-text-muted mt-0.5">{config.description}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-200 cursor-pointer">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Settings */}
      <div className="px-5 py-4 space-y-5">
        {config.settings.map((setting) => (
          <SettingRow key={setting.key} setting={setting} value={values[setting.key]} onChange={(v) => setValue(setting.key, v)} />
        ))}
      </div>

      {/* Run button */}
      <div className="px-5 py-4 border-t border-border-active">
        <button
          onClick={() => onRun(values)}
          className="w-full h-[40px] rounded-xl text-[14px] font-semibold bg-accent-primary text-white hover:brightness-110 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play size={15} strokeWidth={2} />
          Run Stage
        </button>
      </div>
    </div>
  );
}

function SettingRow({ setting, value, onChange }: { setting: StageSetting; value: any; onChange: (v: any) => void }) {
  switch (setting.type) {
    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-text-primary">{setting.label}</span>
          <Toggle checked={value} onChange={onChange} />
        </div>
      );
    case 'slider':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-text-primary">{setting.label}</span>
            <span className="text-[13px] font-mono text-text-muted">{value}{setting.unit || ''}</span>
          </div>
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-bg-active rounded-full appearance-none cursor-pointer accent-accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg-deep [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      );
    case 'select':
      return (
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-text-primary">{setting.label}</span>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-[32px] px-3 rounded-lg text-[13px] bg-bg-active border border-border-active text-text-primary outline-none focus:border-accent-primary cursor-pointer appearance-none pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23706B85' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            {setting.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-[44px] h-[24px] rounded-full relative transition-colors duration-200 cursor-pointer',
        checked ? 'bg-accent-primary' : 'bg-bg-active'
      )}
    >
      <div className={cn(
        'absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200',
        checked ? 'left-[23px]' : 'left-[3px]'
      )} />
    </button>
  );
}
