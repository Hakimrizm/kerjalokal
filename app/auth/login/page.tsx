import { LoginForm } from "@/components/login-form";

export const instant = false;

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const candidate = params.next ?? "";
  const nextPath = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : undefined;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
