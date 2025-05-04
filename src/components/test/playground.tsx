import { api } from "@/lib/trpc/client";

function Test({ slug }: { slug: string }) {
  const addObjekts = api.list.addObjektsToList.useMutation({
    onSuccess: async () => {},
  });

  return (
    <div>
      <button
        onClick={() => {
          addObjekts.mutate({
            slug,
            collectionSlugs: ["atom02-kaede-104z", "atom02-dahyun-106z"],
          });
        }}
      >
        click
      </button>
    </div>
  );
}
