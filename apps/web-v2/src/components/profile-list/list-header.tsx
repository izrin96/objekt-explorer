import { useState } from "react";
import { useProfileListAuthed, useTarget } from "@/hooks/use-target";
import { Button } from "../ui/button";
// import { EditListModal } from "./modal/manage-list";

export default function ProfileListHeader() {
  const list = useTarget((a) => a.profileList)!;
  const isListAuthed = useProfileListAuthed();
  return (
    <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="font-semibold text-lg">{list.name}</div>
          {/* todo */}
        </div>
      </div>

      {isListAuthed && <EditProfileList slug={list.slug} />}
    </div>
  );
}

function EditProfileList({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* <EditListModal slug={slug} open={open} setOpen={setOpen} /> */}
      <Button
        size="sm"
        intent="outline"
        onClick={() => setOpen(true)}
        className="w-full flex-none sm:w-auto"
      >
        Edit List
      </Button>
    </>
  );
}
