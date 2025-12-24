import Hatter from "./components/Hatter";

export default function Home() {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
        <main className="flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-12">
          <Hatter />
        </main>
      </div>
    </>
  );
}
