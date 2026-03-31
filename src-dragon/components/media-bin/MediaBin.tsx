'use client';

import { useState, useCallback, useRef } from 'react';
import { useMediaStore } from '@/stores/mediaStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useHistoryStore } from '@/stores/historyStore';
import { FolderOpen, Music, Image, Sparkles, Upload, Film, Plus, Trash2, Clock, GripVertical, FilePlus, FileX, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaItem } from '@/lib/types';
import ContextMenu, { ContextMenuItem } from '@/components/shared/ContextMenu';
import { TRACK_COLORS } from '@/lib/constants';
import { generateId } from '@/lib/utils';

const TABS = [
  { id: 'footage' as const, label: 'Footage', icon: Film },
  { id: 'audio' as const, label: 'Audio', icon: Music },
  { id: 'images' as const, label: 'Images', icon: Image },
  { id: 'ai-generated' as const, label: 'AI', icon: Sparkles },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  video: Film, audio: Music, image: Image, sfx: Music, 'ai-generated': Sparkles,
};

const ACCEPT_MAP: Record<string, string> = {
  footage: 'video/*,.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.m4v',
  audio: 'audio/*,.mp3,.wav,.aac,.ogg,.flac,.m4a,.wma',
  images: 'image/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff',
  'ai-generated': 'video/*,image/*',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MediaBin() {
  const items = useMediaStore((s) => s.items);
  const activeTab = useMediaStore((s) => s.activeTab);
  const setActiveTab = useMediaStore((s) => s.setActiveTab);
  const addFiles = useMediaStore((s) => s.addFiles);
  const removeItem = useMediaStore((s) => s.removeItem);
  const selectedId = useMediaStore((s) => s.selectedId);
  const selectItem = useMediaStore((s) => s.selectItem);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reimportRef = useRef<HTMLInputElement>(null);
  const [reimportId, setReimportId] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) addFiles(files);
  }, [addFiles]);

  const handleFileSelect = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) addFiles(files);
    e.target.value = '';
  }, [addFiles]);

  const handleReimport = useCallback((itemId: string) => {
    setReimportId(itemId);
    reimportRef.current?.click();
  }, []);

  const handleReimportChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addFiles([file]);
    e.target.value = '';
    setReimportId(null);
  }, [addFiles]);

  const handleItemDragStart = useCallback((e: React.DragEvent, item: MediaItem) => {
    e.dataTransfer.setData('application/dragon-media', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    const dragEl = document.createElement('div');
    dragEl.style.cssText = 'position:absolute;top:-1000px;padding:4px 10px;background:#1A1726;border:1px solid #2D2844;border-radius:6px;color:#F0EEF5;font-size:11px;font-family:system-ui;white-space:nowrap;';
    dragEl.textContent = item.name;
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 0, 0);
    setTimeout(() => document.body.removeChild(dragEl), 0);
  }, []);

  const handleAddToTimeline = useCallback((item: MediaItem) => {
    const timeline = useTimelineStore.getState();
    useHistoryStore.getState().pushSnapshot();
    const trackType = item.type === 'video' ? 'video' : item.type === 'audio' ? 'mic' : 'broll';
    const existingClips = timeline.clips.filter((c) => c.trackType === trackType);
    const startTime = existingClips.length > 0 ? Math.max(...existingClips.map((c) => c.startTime + c.duration)) : 0;

    if (item.type === 'video') {
      const videoId = generateId();
      const audioId = generateId();
      timeline.addLinkedClips(
        { id: videoId, trackType: 'video', name: item.name, startTime, duration: item.duration || 5, sourceOffset: 0, color: TRACK_COLORS['video'], linkedClipId: audioId },
        { id: audioId, trackType: 'mic', name: item.name.replace(/\.\w+$/, ' (audio)$&'), startTime, duration: item.duration || 5, sourceOffset: 0, color: TRACK_COLORS['mic'], linkedClipId: videoId }
      );
    } else {
      timeline.addClip({ id: generateId(), trackType, name: item.name, startTime, duration: item.duration || 5, sourceOffset: 0, color: TRACK_COLORS[trackType] || '#888' });
    }
  }, []);

  const handleRemoveFromTimeline = useCallback((item: MediaItem) => {
    const timeline = useTimelineStore.getState();
    useHistoryStore.getState().pushSnapshot();
    const matching = timeline.clips.filter((c) => c.name === item.name || c.name === item.name.replace(/\.\w+$/, ' (audio)$&'));
    for (const clip of matching) timeline.removeClip(clip.id);
  }, []);

  const getContextMenuItems = useCallback((item: MediaItem): ContextMenuItem[] => {
    const hasUrl = item.url && item.url.length > 0;
    const onTimeline = useTimelineStore.getState().clips.some((c) => c.name === item.name);

    return [
      { label: 'Add to Timeline', icon: <FilePlus size={13} strokeWidth={1.5} />, action: () => handleAddToTimeline(item) },
      ...(onTimeline ? [{ label: 'Remove from Timeline', icon: <Scissors size={13} strokeWidth={1.5} />, action: () => handleRemoveFromTimeline(item) }] : []),
      { label: '', action: () => {}, separator: true },
      ...(!hasUrl ? [{ label: 'Re-import File', icon: <FolderOpen size={13} strokeWidth={1.5} />, action: () => handleReimport(item.id) }] : []),
      { label: 'Delete', icon: <Trash2 size={13} strokeWidth={1.5} />, action: () => removeItem(item.id), danger: true },
    ];
  }, [handleAddToTimeline, handleRemoveFromTimeline, handleReimport, removeItem]);

  const filteredItems = items.filter((item) => {
    if (activeTab === 'footage') return item.type === 'video';
    if (activeTab === 'audio') return item.type === 'audio' || item.type === 'sfx';
    if (activeTab === 'images') return item.type === 'image';
    if (activeTab === 'ai-generated') return item.type === 'ai-generated';
    return true;
  });

  const tabCounts = {
    footage: items.filter((i) => i.type === 'video').length,
    audio: items.filter((i) => i.type === 'audio' || i.type === 'sfx').length,
    images: items.filter((i) => i.type === 'image').length,
    'ai-generated': items.filter((i) => i.type === 'ai-generated').length,
  };

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      <input ref={fileInputRef} type="file" multiple accept={ACCEPT_MAP[activeTab] || '*/*'} onChange={handleFileInputChange} className="hidden" />
      <input ref={reimportRef} type="file" accept={ACCEPT_MAP[activeTab] || '*/*'} onChange={handleReimportChange} className="hidden" />

      {/* Header */}
      <div className="h-[40px] bg-bg-panel-header border-b border-border-active flex items-center px-4 shrink-0">
        <span className="text-[12px] font-mono font-medium uppercase tracking-[1.5px] text-text-muted">Media</span>
        <div className="flex-1" />
        <button onClick={handleFileSelect} className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all duration-200 cursor-pointer" title="Add files from computer">
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-active shrink-0">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id];
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} title={tab.label}
              className={cn('flex-1 h-[34px] flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.5px] transition-all duration-200 cursor-pointer border-b-2',
                activeTab === tab.id ? 'text-accent-primary border-accent-primary bg-accent-primary/5' : 'text-text-muted hover:text-text-secondary border-transparent')}>
              <tab.icon size={12} strokeWidth={1.5} />
              {count > 0 && (
                <span className={cn('text-[8px] min-w-[14px] h-[14px] rounded-full flex items-center justify-center',
                  activeTab === tab.id ? 'bg-accent-primary/20 text-accent-primary' : 'bg-bg-active text-text-faint')}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto p-3 transition-colors duration-200', isDragging && 'bg-accent-primary/5 ring-2 ring-inset ring-accent-primary/20')}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-bg-surface border border-border-default flex items-center justify-center">
              <Upload size={20} strokeWidth={1.5} className="text-text-faint" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] text-text-muted font-medium">{isDragging ? 'Drop to import' : 'No files yet'}</p>
              <p className="text-[11px] text-text-faint">Drag files here or click + to browse</p>
            </div>
            <button onClick={handleFileSelect} className="h-[28px] px-4 rounded-lg text-[11px] font-medium border border-border-default text-text-muted bg-bg-surface hover:bg-bg-hover hover:text-text-secondary transition-all duration-200 cursor-pointer flex items-center gap-1.5">
              <FolderOpen size={12} strokeWidth={1.5} /> Browse Files
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredItems.map((item) => {
              const Icon = TYPE_ICONS[item.type] || Film;
              const isSelected = selectedId === item.id;
              const hasThumbnail = item.thumbnailUrl && item.thumbnailUrl.length > 0;
              const hasUrl = item.url && item.url.length > 0;

              return (
                <ContextMenu key={item.id} items={getContextMenuItems(item)}>
                  <div
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onClick={() => selectItem(item.id)}
                    className={cn(
                      'flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing group',
                      isSelected ? 'bg-accent-primary/5 border-accent-primary/25' : 'bg-bg-surface border-border-default hover:border-border-active hover:bg-bg-hover',
                      !hasUrl && 'opacity-60'
                    )}
                  >
                    {/* Drag handle */}
                    <div className="opacity-0 group-hover:opacity-40 transition-opacity duration-150 shrink-0">
                      <GripVertical size={10} strokeWidth={1.5} className="text-text-faint" />
                    </div>

                    {/* Thumbnail */}
                    {hasThumbnail ? (
                      <div className="w-[144px] h-[96px] rounded-lg overflow-hidden bg-bg-hover shrink-0 border border-border-default/50">
                        <img src={item.thumbnailUrl!} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={cn('w-[144px] h-[96px] rounded-lg flex items-center justify-center shrink-0 border border-border-default/50',
                        isSelected ? 'bg-accent-primary/10' : 'bg-bg-hover group-hover:bg-bg-active')}>
                        <Icon size={28} strokeWidth={1.5} className={isSelected ? 'text-accent-primary' : 'text-text-faint group-hover:text-text-muted'} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-text-primary truncate font-medium">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.duration != null && item.duration > 0 && (
                          <span className="text-[9px] font-mono text-text-muted flex items-center gap-0.5">
                            <Clock size={8} strokeWidth={1.5} />{formatDuration(item.duration)}
                          </span>
                        )}
                        <span className="text-[8px] text-text-faint uppercase">{item.type}</span>
                        {!hasUrl && <span className="text-[8px] text-accent-orange">needs import</span>}
                      </div>
                    </div>

                    {/* Delete button — always visible on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-text-faint hover:text-accent-red hover:bg-accent-red/10 transition-all duration-150 cursor-pointer shrink-0"
                      title="Delete media"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </ContextMenu>
              );
            })}

            <button onClick={handleFileSelect} className="flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-dashed border-border-default text-text-faint hover:text-text-muted hover:border-border-active transition-all duration-200 cursor-pointer">
              <Plus size={12} strokeWidth={1.5} /><span className="text-[11px]">Add more files</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
