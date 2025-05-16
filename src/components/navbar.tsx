import { ThemeSwitcher } from "./theme-switcher";
import { Cube } from "@phosphor-icons/react/dist/ssr";
import { Container, Link } from "./ui";
import UserSearch from "./user-search";
import UserNav from "./user-nav";

export default async function Navbar() {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30 from-bg/80 bg-gradient-to-b to-transparent">
      <div className="size-full absolute -z-1 mask-b-from-40% backdrop-blur-lg"></div>
      <Container className="flex justify-center">
        <div className="grow gap-4 flex items-center h-14">
          <Link href="/">
            <div className="flex gap-2 items-center">
              <Cube size={24} weight="fill" />
              <span className="font-semibold text-lg select-none truncate hidden sm:block">
                Objekt Tracker
              </span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <UserNav />
          <UserSearch />
        </div>
      </Container>
    </nav>
  );
}
