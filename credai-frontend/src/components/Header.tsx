import React from "react";

type Props = {
  connected: boolean;
  account: string;
  connectWallet: () => void;
  user?: {
    username?: string;
    totalDocuments?: number;
  } | null;
};

export default function Header({ connected, account, connectWallet, user }: Props) {
  const shortAccount = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "";

  return (
    <header className="fixed top-0 left-0 z-50 w-full bg-white shadow-sm">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <div className="text-lg font-extrabold tracking-tight text-gray-900">CredAI</div>
            {user?.username && (
              <div className="items-center hidden gap-2 text-sm text-gray-600 sm:flex">
                <span className="font-medium">{user.username}</span>
                <span className="text-gray-400">({user.totalDocuments ?? 0} docs)</span>
              </div>
            )}
          </div>

          <nav className="flex items-center gap-6">
            <div className="items-center hidden gap-4 md:flex">
              <a className="text-sm text-gray-700 hover:text-gray-900" href="#about">About</a>
              <a className="text-sm text-gray-700 hover:text-gray-900" href="#docs">Docs</a>
              <a className="text-sm text-gray-700 hover:text-gray-900" href="#github">GitHub</a>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={connectWallet}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition bg-black rounded-md shadow hover:bg-gray-900"
                aria-pressed={connected}
              >
                {connected ? shortAccount : "Connect Wallet"}
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}



