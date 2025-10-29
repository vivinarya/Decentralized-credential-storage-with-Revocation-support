interface User {
  walletAddress: string;
  username: string;
  totalDocuments: number;
  createdAt: string;
  lastLogin: string;
}

type HeaderProps = {
  connected: boolean;
  account: string;
  connectWallet: () => void;
  user?: User | null;
};

export default function Header({ connected, account, connectWallet, user }: HeaderProps) {
  return (
    <header className="flex items-center justify-between w-full px-6 py-4 bg-white shadow-md select-none">
      <div className="text-2xl font-extrabold tracking-tight text-gray-900 cursor-pointer">
        CredAI
      </div>
      <nav className="flex items-center space-x-6">
        {user && (
          <div className="text-sm text-gray-600">
            {user.username} ({user.totalDocuments} docs)
          </div>
        )}
        <button
          onClick={connectWallet}
          className="px-4 py-2 font-semibold text-white transition bg-black rounded hover:bg-gray-800"
        >
          {connected ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
        </button>
        <a href="#" className="font-medium text-gray-700 hover:text-gray-900">About</a>
        <a href="#" className="font-medium text-gray-700 hover:text-gray-900">Docs</a>
        <a href="#" className="font-medium text-gray-700 hover:text-gray-900">GitHub</a>
      </nav>
    </header>
  );
}


