import SignIn from "@/components/auth/sign-in";

export default async function SignInPage() {
  return (
    <div className="flex items-center justify-center w-full min-h-[120px]">
      <div className="max-w-xl w-full flex flex-col gap-2">
        <SignIn />
      </div>
    </div>
  );
}
