import { useAbstractPrivyLogin } from "@abstract-foundation/agw-react/privy";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { orpc } from "@/lib/orpc/client";
import { Button, buttonStyles } from "../ui/button";
import { Link } from "../ui/link";

export default function AbstractProcess() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [address, setAddress] = useState("");
  const { authenticated } = usePrivy();

  if (isSuccess) {
    return <Welcome address={address} />;
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {authenticated ? (
        <ConnectedState
          onSuccess={(address) => {
            setIsSuccess(true);
            setAddress(address);
          }}
        />
      ) : (
        <SignInButton />
      )}
    </div>
  );
}

function SignInButton() {
  const { login } = useAbstractPrivyLogin();

  return (
    <Button onClick={login} intent="outline">
      <img
        className="invert dark:invert-0"
        src="/abs.svg"
        alt="Abstract logomark"
        width={20}
        height={20}
      />
      Sign in with Abstract
    </Button>
  );
}

function ConnectedState({ onSuccess }: { onSuccess: (address: string) => void }) {
  const { logout } = usePrivy();
  const { address } = useAccount();

  const linkAbs = useMutation(
    orpc.cosmoLink.linkAbs.mutationOptions({
      onSuccess: (address) => {
        onSuccess(address);
        logout();
        toast.success("Successful linked");
      },
      onError: ({ message }) => {
        toast.error(`Error linking. ${message}`);
      },
    }),
  );

  if (!address) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="mb-1 font-medium text-sm sm:text-base">Connected to Abstract</p>
        <p className="break-all font-mono text-gray-400 text-xs">{address}</p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2">
          <Button intent="outline" onClick={logout}>
            Disconnect
          </Button>
        </div>
        <Button intent="primary" onClick={() => linkAbs.mutate(null)} isPending={linkAbs.isPending}>
          Confirm and link
        </Button>
      </div>
    </div>
  );
}

function Welcome({ address }: { address: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src="/3d-icons/icon-welcome.png"
        width={220}
        height={220}
        alt="Welcome"
        className="fade-in zoom-in absolute inset-0 size-full animate-in duration-200"
      />
      <span>Success. Profile linked</span>
      <div>
        <Link
          className={buttonStyles({
            intent: "secondary",
          })}
          to="/@{$nickname}"
          params={{ nickname: address }}
        >
          Go to your profile
        </Link>
      </div>
    </div>
  );
}
