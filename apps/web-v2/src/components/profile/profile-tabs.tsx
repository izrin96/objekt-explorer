import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTarget } from "@/hooks/use-target";
import { Tab, TabList, Tabs } from "../ui/tabs";

export default function ProfileTabs() {
  const { pathname } = useLocation();
  const profile = useTarget((a) => a.profile)!;
  const navigate = useNavigate();
  const identifier = profile.nickname ?? profile.address;

  const links = [
    { to: `/@{$nickname}`, label: "Collection" },
    { to: `/@{$nickname}/trades`, label: "Trade History" },
    { to: `/@{$nickname}/progress`, label: "Progress" },
    { to: `/@{$nickname}/stats`, label: "Statistics" },
  ].map((link) => ({ ...link, href: link.to.replace("{$nickname}", identifier) }));

  const currentLink = links.find((link) => link.href === decodeURIComponent(pathname));

  return (
    <div className="overflow-x-auto">
      <Tabs
        aria-label="Navbar"
        className="w-min"
        selectedKey={decodeURIComponent(currentLink?.to ?? "")}
        onSelectionChange={(key) => {
          navigate({ to: key.toString(), params: { nickname: identifier } });
        }}
      >
        <TabList>
          {links.map((item) => (
            <Tab key={item.to} id={item.to} aria-label={item.label}>
              {item.label}
            </Tab>
          ))}
        </TabList>
      </Tabs>
    </div>
  );
}
