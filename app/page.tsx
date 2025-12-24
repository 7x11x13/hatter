import Hatter from "./components/Hatter";

export default function Home() {
  return (
    <>
      <link rel="apple-touch-icon" sizes="180x180" href="/hatter/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/hatter/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/hatter/favicon-16x16.png" />
      <link rel="manifest" href="/hatter/site.webmanifest" />
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
        <main className="flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-12">
          <Hatter />
        </main>
      </div>
    </>
  );
}
