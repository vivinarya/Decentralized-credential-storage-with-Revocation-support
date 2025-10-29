type Props = {
  connectWallet: () => void;
  connected: boolean;
  account: string;
};

export default function Navbar({ connectWallet, connected, account }: Props) {
  return (
    <nav className="flex items-center justify-between px-6 pt-4">
      <div className="text-lg font-bold">FediLearn®</div>
      <div className="flex space-x-2">
        <button onClick={connectWallet} className="px-4 py-1 font-semibold text-white bg-black rounded">
          {connected ? account.slice(0, 6) + "..." : "Connect Wallet"}
        </button>
        <button className="px-4 py-1 bg-gray-100 rounded">About</button>
        <button className="px-4 py-1 bg-gray-100 rounded">Docs</button>
        <button className="px-4 py-1 bg-gray-100 rounded">GitHub</button>
      </div>
    </nav>
  );
}




