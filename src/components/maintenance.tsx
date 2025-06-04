"use client";

import React from "react";

export default function MaintenanceNotice() {
  return (
    <div className="static top-0 w-full flex justify-center items-center h-8 text-sm font-semibold bg-muted text-muted-fg">
      Site will be offline for migration to new server at{" "}
      {new Date("2025-06-04T16:00:00.000Z").toString()}. ETA 10 minutes.
    </div>
  );
}
