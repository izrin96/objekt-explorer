import { type RefObject, useEffect, useRef, useState } from "react";
import type { CropperRef } from "react-advanced-cropper";

import { isCroppable } from "@/features/link/banner-upload";

/** The banner pick, its crop readiness and Remove, kept by the form that saves them. */
export function useBannerPick(saveRef: RefObject<AbortController | null>) {
  const cropperRef = useRef<CropperRef>(null);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [cropReady, setCropReady] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  // a file dropped anywhere but the dropzone (which cancels its own events) would open in the tab
  // and lose the dialog; refuse it so the cursor shows the drop is not allowed
  useEffect(() => {
    const refuseDragOver = (event: DragEvent) => {
      if (event.defaultPrevented || !event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
    };
    const refuseDrop = (event: DragEvent) => {
      if (!event.defaultPrevented) event.preventDefault();
    };
    window.addEventListener("dragover", refuseDragOver);
    window.addEventListener("drop", refuseDrop);
    return () => {
      window.removeEventListener("dragover", refuseDragOver);
      window.removeEventListener("drop", refuseDrop);
    };
  }, []);

  // a replaced pick, a Clear, a Save and a Cancel all release the preview's object URL here
  const pickedUrl = picked?.url;
  useEffect(() => {
    if (pickedUrl === undefined) return;
    return () => URL.revokeObjectURL(pickedUrl);
  }, [pickedUrl]);

  const clearPick = () => {
    saveRef.current?.abort();
    setPicked(null);
    setCropReady(false);
  };

  const awaitingCrop = picked !== null && !removeBanner && isCroppable(picked.file) && !cropReady;

  return {
    cropperRef,
    picked,
    setPicked,
    setCropReady,
    removeBanner,
    setRemoveBanner,
    clearPick,
    awaitingCrop,
  };
}
