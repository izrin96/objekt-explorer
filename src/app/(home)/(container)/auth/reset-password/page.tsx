import ResetPassword from "@/components/auth/reset-password";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return <div>Invalid token</div>;
  }
  return <ResetPassword token={token} />;
}
