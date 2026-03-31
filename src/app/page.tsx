"use client";
import { useState, useEffect } from "react";
import Editor from "@/features/editor";
import { ModeSelect } from "@/features/editor/mode-select";

const PROJECT_KEY = "dragon-editor:project-config";

export default function Home() {
  const [projectConfig, setProjectConfig] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROJECT_KEY);
      if (saved) setProjectConfig(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  const handleStart = (config: { name: string; mode: string; style: string }) => {
    setProjectConfig(config);
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(config));
    } catch {}
  };

  if (!loaded) return null;

  if (!projectConfig) {
    return <ModeSelect onStart={handleStart} />;
  }

  return <Editor />;
}
