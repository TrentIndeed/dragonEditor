import { memo, useCallback } from "react";
import useLayoutStore from "./store/use-layout-store";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ScrollArea } from "@/components/ui/scroll-area";

const MENU_ITEMS = [
  { id: "uploads", icon: Icons.upload, label: "Media" },
  { id: "ai-pipeline", icon: Icons.sparkles, label: "AI Pipeline" },
  { id: "texts", icon: Icons.type, label: "Text" },
  { id: "videos", icon: Icons.video, label: "Video" },
  { id: "captions", icon: Icons.captions, label: "Captions" },
  { id: "images", icon: Icons.image, label: "Images" },
  { id: "audios", icon: Icons.audio, label: "Music" },
  { id: "transitions", icon: Icons.transition, label: "Transitions" },
  { id: "sfx", icon: Icons.sfx, label: "SFX" },
  { id: "ai-chat", icon: Icons.messages, label: "AI Chat" },
] as const;

const MenuButton = memo<{
  item: (typeof MENU_ITEMS)[number];
  isActive: boolean;
  onClick: (menuItem: string) => void;
}>(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item.id);
  }, [item.id, onClick]);

  const IconComponent = item.icon;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center gap-1 py-2 px-1 w-full rounded-lg cursor-pointer transition-all duration-150",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <IconComponent width={18} height={18} />
      <span className="text-[10px] font-medium leading-none">{item.label}</span>
    </button>
  );
});

MenuButton.displayName = "MenuButton";

function MenuList() {
  const {
    setActiveMenuItem,
    setShowMenuItem,
    activeMenuItem,
    showMenuItem,
    drawerOpen,
    setDrawerOpen
  } = useLayoutStore();

  const isLargeScreen = useIsLargeScreen();

  const handleMenuItemClick = useCallback(
    (menuItem: string) => {
      setActiveMenuItem(menuItem as any);
      if (!isLargeScreen) {
        setDrawerOpen(true);
      } else {
        setShowMenuItem(true);
      }
    },
    [isLargeScreen, setActiveMenuItem, setDrawerOpen, setShowMenuItem]
  );

  return (
    <div className="flex flex-col w-[72px] shrink-0 border-r border-border/50 bg-card">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-1.5">
          {MENU_ITEMS.map((item) => {
            const isActive =
              (drawerOpen && activeMenuItem === item.id) ||
              (showMenuItem && activeMenuItem === item.id);
            return (
              <MenuButton
                key={item.id}
                item={item}
                isActive={isActive}
                onClick={handleMenuItemClick}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default memo(MenuList);
