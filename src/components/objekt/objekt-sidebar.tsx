type Props = {
  collection: string;
  serial?: number;
};

export default function ObjektSidebar({ collection, serial }: Props) {
  return (
    <div className="@container absolute right-0 flex h-full w-[11%] select-none items-center justify-center text-(--objekt-text-color) [writing-mode:vertical-lr]">
      <span className="font-semibold text-[4cqh]">{collection}</span>
      {serial !== undefined && (
        <div className="flex pt-[.5em] font-medium text-[4cqh]">
          <span className="pb-[.1em]">#</span>
          <span>{serial}</span>
        </div>
      )}
    </div>
  );
}
