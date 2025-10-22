import { Loader } from "./ui/loader";

export default function PendingComponent() {
  return (
    <div className="flex justify-center">
      <Loader variant="ring" />
    </div>
  );
}
