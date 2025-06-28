type Props = {
  collection: string;
  serial?: number;
};

export default function ObjektSidebar({ collection, serial }: Props) {
  return (
    <div className="@container absolute right-0 flex h-full w-[11%] select-none items-center justify-center gap-1.5 text-(--objekt-text-color) [writing-mode:vertical-lr]">
      <span className="font-bold text-[3.4cqh]">{collection}</span>
      {serial !== undefined && (
        <div className="flex gap-0.5 font-light text-[3.4cqh] tabular-nums">
          <span>#</span>
          <span>{serial}</span>
        </div>
      )}
    </div>
  );
}
