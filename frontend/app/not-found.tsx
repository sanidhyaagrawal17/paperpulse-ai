import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#040508] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h2 className="text-2xl font-bold font-mono text-cyan-400">404 - Document Not Found</h2>
      <p className="text-sm text-zinc-400 max-w-md">
        The research dossier or topology node you requested could not be located in the ChromaDB vector store.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all"
      >
        Return to Literature Synthesis
      </Link>
    </div>
  );
}
