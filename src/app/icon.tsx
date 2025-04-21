import { IconMoonFill } from "@intentui/icons";
import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [
    {
      contentType: "image/png",
      size: { width: 32, height: 32 },
      id: "tiny",
    },
    {
      contentType: "image/png",
      size: { width: 48, height: 48 },
      id: "small",
    },
    {
      contentType: "image/png",
      size: { width: 72, height: 72 },
      id: "medium",
    },
    {
      contentType: "image/png",
      size: { width: 96, height: 96 },
      id: "large",
    },
    {
      contentType: "image/png", 
      size: { width: 192, height: 192 },
      id: "xlarge",
    }
  ];
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#2F425E",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#BDD8FF",
          borderRadius: "15%",
        }}
      >
        <IconMoonFill
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    )
  );
}
