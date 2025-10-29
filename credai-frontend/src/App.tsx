import { useState, useEffect, useCallback } from "react";
import api from "./api";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import FeatureCards from "./components/FeatureCards";
import UploadModal from "./components/UploadModal";
import VerifyModal from "./components/VerifyModal";
import ExpiredChecker from "./components/ExpiredChecker";
import RevocationPanel from "./components/RevocationPanel";
import HistoryPanel from "./components/HistoryPanel";
import FAQCollapse from "./components/FAQCollapse";
import Footer from "./components/Footer";

interface EthereumProvider {
  request: (args: { method: string }) => Promise<unknown>;
  isMetaMask?: boolean;
  on?: (event: string, callback: (accounts: string[]) => void) => void;
  removeListener?: (event: string, callback: (accounts: string[]) => void) => void;
}

interface User {
  walletAddress: string;
  username: string;
  totalDocuments: number;
  createdAt: string;
  lastLogin: string;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function App() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not found! Please install MetaMask extension.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      // Always request accounts (this will prompt MetaMask each visit)
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      const walletAddress = accounts[0];
      setAccount(walletAddress);
      setConnected(true);

      // Authenticate user with backend (best-effort, keep user null if auth fails)
      try {
        const res = await api.post("/api/user/auth", {
          walletAddress,
        });
        setUser(res.data.user);
      } catch (err) {
        console.error("User authentication failed:", err);
        setUser(null);
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setConnected(false);
      setAccount("");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // On every page load (mount), request wallet connection so the user is prompted each visit.
    connectWallet();

    // Listen for account changes to update local state
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setConnected(true);
        // re-run auth when account changes
        api.post("/api/user/auth", { walletAddress: accounts[0] })
          .then((res) => setUser(res.data.user))
          .catch(() => setUser(null));
      } else {
        // user disconnected account in wallet
        setAccount("");
        setConnected(false);
        setUser(null);
      }
    };

    if (window.ethereum?.on) {
      try {
        window.ethereum.on("accountsChanged", handleAccountsChanged);
      } catch (err) {
        console.warn("Failed to attach accountsChanged listener:", err);
      }
    }

    return () => {
      // remove listener if provider supports removeListener (typed)
      try {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      } catch {
        // ignore
      }
    };
  }, [connectWallet]);

  return (
    <div className="flex flex-col min-h-screen bg-white font-inter">
      <Header
        connected={connected}
        account={account}
        connectWallet={connectWallet}
        user={user}
      />

      <main className="mt-8">
        <HeroSection setShowUpload={setShowUpload} />
        <FeatureCards />
        <HistoryPanel />
        <FAQCollapse />
      </main>

      <Footer />

      {/* Modals */}
      {showUpload && <UploadModal setShowUpload={setShowUpload} />}
      {showVerify && <VerifyModal setShowVerify={setShowVerify} />}
      {showExpired && <ExpiredChecker setShowExpired={setShowExpired} />}
      {showRevoke && <RevocationPanel setShowRevoke={setShowRevoke} />}
    </div>
  );
}

export default App;





