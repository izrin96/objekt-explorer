import { IconMoonFill } from "justd-icons";
import { ThemeSwitcher } from "./theme-switcher";
import { Container } from "./ui";
import UserSearch from "./user-search";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-30 bg-bg/80 backdrop-blur-lg">
      <Container className="flex justify-center">
        <div className="grow gap-4 flex items-center h-14">
          <Link href="/">
            <div className="flex gap-2 items-center">
              <IconMoonFill className="size-5" />
              <span className="font-semibold text-xl sm:block hidden">
                Lunar
              </span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <UserSearch />
        </div>
      </Container>
    </nav>
  );
}
