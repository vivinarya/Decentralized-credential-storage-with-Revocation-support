import React from "react";

type HeaderProps = {
  connected: boolean;
  account: string;
  connectWallet: () => void;
};

export default function Header({ connected, account, connectWallet }: HeaderProps) {
  return (
    <header className="flex items-center justify-between w-full px-6 py-4 bg-white shadow-md">
      <div className="text-2xl font-extrabold text-gray-900 cursor-pointer select-none">
        CredAI
      </div>
      <nav className="flex items-center space-x-4">
        <button
          onClick={connectWallet}
          className="px-4 py-2 font-semibold text-white transition bg-black rounded hover:bg-gray-800"
        >
          {connected ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
        </button>
        <a href="#" className="font-semibold text-gray-700 hover:text-black">About</a>
        <a href="#" className="font-semibold text-gray-700 hover:text-black">Docs</a>
        <a href="#" className="font-semibold text-gray-700 hover:text-black">GitHub</a>
      </nav>
    </header>
  );
}
