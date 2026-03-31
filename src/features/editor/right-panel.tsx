"use client";

import React, { useEffect, useState } from "react";
import {
  IAudio, ICaption, IImage, IText, ITrackItem, ITrackItemAndDetails, IVideo
} from "@designcombo/types";
import BasicText from "./control-item/basic-text";
import BasicImage from "./control-item/basic-image";
import BasicVideo from "./control-item/basic-video";
import BasicAudio from "./control-item/basic-audio";
import BasicCaption from "./control-item/basic-caption";
import { EditorChat } from "./control-item/editor-chat";
import useStore from "./store/use-store";
import useLayoutStore from "./store/use-layout-store";

const ActiveControlItem = ({ trackItem }: { trackItem?: ITrackItemAndDetails }) => {
  if (!trackItem) return null;
  return (
    <>
      {{
        text: <BasicText trackItem={trackItem as ITrackItem & IText} />,
        caption: <BasicCaption trackItem={trackItem as ITrackItem & ICaption} />,
        image: <BasicImage trackItem={trackItem as ITrackItem & IImage} />,
        video: <BasicVideo trackItem={trackItem as ITrackItem & IVideo} />,
        audio: <BasicAudio trackItem={trackItem as ITrackItem & IAudio} />,
      }[trackItem.type as "text"]}
    </>
  );
};

/**
 * Right side panel:
 * - When a timeline item is selected → shows item properties (video/text/audio controls)
 * - When nothing is selected → shows AI Editor chatbot
 */
export function RightPanel() {
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const { setTrackItem: setLayoutTrackItem } = useLayoutStore();
  const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      const item = trackItemsMap[id];
      if (item) {
        setTrackItem(item);
        setLayoutTrackItem(item);
      } else {
        setTrackItem(null);
        setLayoutTrackItem(null);
      }
    } else {
      setTrackItem(null);
      setLayoutTrackItem(null);
    }
  }, [activeIds, trackItemsMap, transitionsMap, setLayoutTrackItem]);

  return (
    <div className="w-full h-full bg-card border-l border-border/80 overflow-hidden">
      {trackItem ? (
        <ActiveControlItem trackItem={trackItem} />
      ) : (
        <EditorChat />
      )}
    </div>
  );
}
