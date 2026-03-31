"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { ControlItem } from "./control-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import MenuListHorizontal from "./menu-list-horizontal";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import useLayoutStore from "./store/use-layout-store";
import ControlItemHorizontal from "./control-item-horizontal";
import { RightPanel } from "./right-panel";
import { useAutoSave } from "./hooks/use-auto-save";
import { useLinkedAudio } from "./hooks/use-linked-audio";
import { useSnap } from "./hooks/use-snap";
import { useRippleDelete } from "./hooks/use-ripple-delete";
import { design } from "./mock";
// import { Separator } from "@/components/ui/separator";

const stateManager = new StateManager({
  size: {
    width: 1080,
    height: 1920,
  },
});

const SceneContainer = ({
  sceneRef,
  playerRef,
  stateManager,
  trackItem,
  loaded,
  isLargeScreen,
}: any) => {
  return (
    <div className="relative flex h-full w-full flex-col bg-background">
      <div className="flex-1 relative overflow-hidden w-full h-full">
        <div className="flex h-full flex-1">
          <div className="flex-1 relative overflow-hidden w-full h-full">
            <CropModal />
            <Scene ref={sceneRef} stateManager={stateManager} />
          </div>
        </div>
      </div>

      <div className="w-full">
        {playerRef && <Timeline stateManager={stateManager} />}
      </div>

      {!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
      {!isLargeScreen && trackItem && <ControlItemHorizontal />}
    </div>
  );
};

const ContentPanel = () => {
  return (
    <div className="bg-card w-full flex flex-col h-full border-r border-border/80 overflow-hidden">
      <ControlItem />
    </div>
  );
};

const Editor = ({ tempId, id }: { tempId?: string; id?: string }) => {
  const [projectName, setProjectName] = useState<string>("Untitled video");
  const { scene } = useSceneStore();
  const timelinePanelRef = useRef<ImperativePanelHandle>(null);
  const sceneRef = useRef<SceneRef>(null);
  const { timeline, playerRef } = useStore();
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
  const {
    setTrackItem: setLayoutTrackItem,
    setFloatingControl,
    setLabelControlItem,
    setTypeControlItem,
  } = useLayoutStore();
  const isLargeScreen = useIsLargeScreen();

  useTimelineEvents();
  useAutoSave();
  useLinkedAudio();
  useSnap();
  useRippleDelete();

  const { setCompactFonts, setFonts } = useDataState();
  // useEffect(() => {
  //   dispatch(DESIGN_LOAD, { payload: design });
  // }, []);
  useEffect(() => {
    setCompactFonts(getCompactFontData(FONTS));
    setFonts(FONTS);
  }, []);

  useEffect(() => {
    loadFonts([
      {
        name: SECONDARY_FONT,
        url: SECONDARY_FONT_URL,
      },
    ]);
  }, []);

  useEffect(() => {
    const screenHeight = window.innerHeight;
    const desiredHeight = 300;
    const percentage = (desiredHeight / screenHeight) * 100;
    timelinePanelRef.current?.resize(percentage);
  }, []);

  const handleTimelineResize = () => {
    const timelineContainer = document.getElementById("timeline-container");
    if (!timelineContainer) return;

    timeline?.resize(
      {
        height: timelineContainer.clientHeight - 90,
        width: timelineContainer.clientWidth - 40,
      },
      {
        force: true,
      },
    );

    // Trigger zoom recalculation when timeline is resized
    setTimeout(() => {
      sceneRef.current?.recalculateZoom();
    }, 100);
  };

  useEffect(() => {
    const onResize = () => handleTimelineResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [timeline]);

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      const trackItem = trackItemsMap[id];
      if (trackItem) {
        setTrackItem(trackItem);
        setLayoutTrackItem(trackItem);
      } else console.log(transitionsMap[id]);
    } else {
      setTrackItem(null);
      setLayoutTrackItem(null);
    }
  }, [activeIds, trackItemsMap]);

  useEffect(() => {
    setFloatingControl("");
    setLabelControlItem("");
    setTypeControlItem("");
  }, [isLargeScreen]);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col">
      <Navbar
        projectName={projectName}
        user={null}
        stateManager={stateManager}
        setProjectName={setProjectName}
      />

      <div className="flex flex-1 min-h-0">
        {/* Vertical icon bar — full height */}
        {isLargeScreen && <MenuList />}

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          {/* Top section: content panel + scene */}
          <div className="flex flex-1 min-h-0">
            {isLargeScreen ? (
              <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                <ResizablePanel
                  defaultSize={25}
                  minSize={15}
                  maxSize={35}
                  className="max-w-xl relative bg-card min-w-0 overflow-visible!"
                >
                  <ContentPanel />
                  <FloatingControl />
                </ResizablePanel>

                <ResizableHandle className="bg-border/90" />

                <ResizablePanel
                  defaultSize={55}
                  minSize={35}
                  className="min-w-0 min-h-0"
                >
                  <div className="relative flex h-full w-full flex-col bg-background">
                    <div className="flex-1 relative overflow-hidden w-full h-full">
                      <CropModal />
                      <Scene ref={sceneRef} stateManager={stateManager} />
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="bg-border/90" />

                <ResizablePanel
                  defaultSize={20}
                  minSize={15}
                  maxSize={30}
                  className="min-w-0 min-h-0 hidden lg:block"
                >
                  <RightPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="relative flex h-full w-full flex-col bg-background">
                <div className="flex-1 relative overflow-hidden w-full h-full">
                  <CropModal />
                  <Scene ref={sceneRef} stateManager={stateManager} />
                </div>
              </div>
            )}
          </div>

          {/* Timeline — full width under content panels */}
          <div className="w-full">
            {playerRef && <Timeline stateManager={stateManager} />}
          </div>

          {!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
          {!isLargeScreen && trackItem && <ControlItemHorizontal />}
        </div>
      </div>
    </div>
  );
};

export default Editor;
