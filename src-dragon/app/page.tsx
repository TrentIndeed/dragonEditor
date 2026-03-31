'use client';

import { useProjectStore } from '@/stores/projectStore';
import ModeSelectScreen from '@/components/mode-select/ModeSelectScreen';
import EditorLayout from '@/components/layout/EditorLayout';

export default function Home() {
  const isEditorOpen = useProjectStore((s) => s.isEditorOpen);

  if (isEditorOpen) {
    return <EditorLayout />;
  }

  return <ModeSelectScreen />;
}
