import { auth } from "~/server/auth";
import { SignIn } from "./_components/sign-in";
import { SignOut } from "./_components/sign-out";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          codex test app
        </h1>

        {session ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-2xl">Welcome, {session.user?.name}!</p>

            <SignOut />
          </div>
        ) : (
          <SignIn />
        )}
      </div>
    </main>
  );
}
