import { Metadata } from "next";
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `My Profile`,
  };
}

export default async function Page() {
  return (
    <div>
      <div className="flex flex-col w-full">
        <div className="text-xl font-semibold">My Profile</div>
      </div>
      <div className="flex flex-col gap-2">
        
      </div>
    </div>
  );
}
