import { TranscriptLine, TimelineClip, TrimSuggestion, MediaItem } from './types';
import { generateId } from './utils';

export const MOCK_TRANSCRIPT: TranscriptLine[] = [
  { id: 'tl-1', startTime: 0.0, endTime: 2.5, speaker: 'Speaker 1', text: 'Hey everyone, welcome back to the channel.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-2', startTime: 2.5, endTime: 4.8, speaker: 'Speaker 1', text: 'Um, so today we are going to talk about', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-3', startTime: 4.8, endTime: 7.2, speaker: 'Speaker 1', text: 'something really exciting that I have been working on.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-4', startTime: 7.2, endTime: 9.0, speaker: 'Speaker 1', text: 'Uh, let me just pull this up real quick.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-5', startTime: 9.0, endTime: 14.5, text: '[silence - searching for something]', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-6', startTime: 14.5, endTime: 17.8, speaker: 'Speaker 1', text: 'Okay so basically what we have here is a new AI tool', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-7', startTime: 17.8, endTime: 21.2, speaker: 'Speaker 1', text: 'that can actually edit your videos automatically.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-8', startTime: 21.2, endTime: 24.0, speaker: 'Speaker 1', text: 'Like, you know, it just figures out the cuts for you.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-9', startTime: 24.0, endTime: 26.5, speaker: 'Speaker 1', text: 'Um, and it does it really well actually.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-10', startTime: 26.5, endTime: 30.0, speaker: 'Speaker 1', text: 'So let me show you how it works step by step.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-11', startTime: 30.0, endTime: 33.5, speaker: 'Speaker 1', text: 'First you upload your raw footage into the editor.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-12', startTime: 33.5, endTime: 36.8, speaker: 'Speaker 1', text: 'Uh, and then the AI analyzes the entire clip.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-13', startTime: 36.8, endTime: 40.2, speaker: 'Speaker 1', text: 'It finds all the dead space, the false starts,', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-14', startTime: 40.2, endTime: 43.0, speaker: 'Speaker 1', text: 'the repeated takes, and the awkward pauses.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-15', startTime: 43.0, endTime: 46.5, speaker: 'Speaker 1', text: 'Then it gives you a list of suggested cuts.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-16', startTime: 46.5, endTime: 50.0, speaker: 'Speaker 1', text: 'You can approve or reject each one individually.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-17', startTime: 50.0, endTime: 53.2, speaker: 'Speaker 1', text: 'Like literally it takes like two minutes to rough cut', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-18', startTime: 53.2, endTime: 55.8, speaker: 'Speaker 1', text: 'what would normally take you an hour.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-19', startTime: 55.8, endTime: 58.0, speaker: 'Speaker 1', text: 'Anyway, let me know what you think in the comments.', deleted: false, edited: false, isFillerWord: false },
  { id: 'tl-20', startTime: 58.0, endTime: 60.0, speaker: 'Speaker 1', text: 'Thanks for watching, see you next time!', deleted: false, edited: false, isFillerWord: false },
];

export const MOCK_TIMELINE_CLIPS: TimelineClip[] = [
  { id: 'clip-v1', trackType: 'video', name: 'raw_footage.mp4', startTime: 0, duration: 60, sourceOffset: 0, color: '#4A6FA5' },
  { id: 'clip-a1', trackType: 'mic', name: 'mic_audio.wav', startTime: 0, duration: 60, sourceOffset: 0, color: '#4CAF50' },
];

export const MOCK_TRIM_SUGGESTIONS: TrimSuggestion[] = [
  { id: 'ts-1', startTime: 9.0, endTime: 14.5, reason: 'Dead space — searching for something on screen', accepted: null, transcriptLineIds: ['tl-5'] },
  { id: 'ts-2', startTime: 2.5, endTime: 4.8, reason: 'Filler words: "Um, so today we are going to talk about"', accepted: null, transcriptLineIds: ['tl-2'] },
  { id: 'ts-3', startTime: 7.2, endTime: 9.0, reason: 'Filler: "Uh, let me just pull this up real quick"', accepted: null, transcriptLineIds: ['tl-4'] },
  { id: 'ts-4', startTime: 24.0, endTime: 26.5, reason: 'Filler words: "Um, and it does it really well actually"', accepted: null, transcriptLineIds: ['tl-9'] },
];

export const MOCK_MEDIA: MediaItem[] = [
  { id: 'media-1', name: 'raw_footage.mp4', type: 'video', duration: 60, url: '', thumbnailUrl: '' },
];

export const FILLER_LINE_IDS = ['tl-2', 'tl-4', 'tl-8', 'tl-9', 'tl-12', 'tl-17'];
