import Hatter from "./components/Hatter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="flex flex-1 items-center justify-center">
        <main className="flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-12">
          <h1 className="text-6xl font-bold text-zinc-900 dark:text-zinc-100 select-none cursor-default">
            🎅
          </h1>
          <Hatter />
        </main>
      </div>
      <footer className="py-4 text-center">
        <a
          href="https://github.com/7x11x13/hatter"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Source Code
        </a>
      </footer>
    </div>
  );
}
