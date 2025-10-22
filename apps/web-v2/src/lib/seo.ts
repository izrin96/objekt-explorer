export const seo = ({ title }: { title: string }) => {
  const tags = [{ title: title ? `${title} · Objekt Tracker` : "Objekt Tracker" }];
  return tags;
};
