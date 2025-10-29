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
import RegisterIssuerModal from "./components/RegisterIssuerModal";
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
  const [showRegisterIssuer, setShowRegisterIssuer] = useState(false);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not found! Please install MetaMask extension.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      const walletAddress = accounts[0];
      setAccount(walletAddress);
      setConnected(true);

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
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setConnected(true);
        api.post("/api/user/auth", { walletAddress: accounts[0] })
          .then((res) => setUser(res.data.user))
          .catch(() => setUser(null));
      } else {
        setAccount("");
        setConnected(false);
        setUser(null);
      }
    };

    // FIX: Check if window.ethereum exists AND if .on is a function
    if (window.ethereum && typeof window.ethereum.on === 'function') {
      try {
        window.ethereum.on("accountsChanged", handleAccountsChanged);
      } catch (err) {
        console.warn("Failed to attach accountsChanged listener:", err);
      }
    }

    const handleBeforeUnload = async () => {
      try {
        const logoutUrl = `${(import.meta.env.VITE_API_BASE as string) || "http://localhost:5000"}/api/user/logout`;
        if (navigator.sendBeacon) {
          fetch(logoutUrl, { 
            method: "POST", 
            keepalive: true,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
        } else {
          fetch(logoutUrl, { 
            method: "POST", 
            keepalive: true,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        console.warn("Logout during unload failed:", e);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      try {
        if (window.ethereum && typeof window.ethereum.removeListener === 'function') {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      } catch {
        // ignore
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
        
        {/* Register Issuer Button */}
        <div className="flex justify-center mt-2 mb-6">
          <button
            onClick={() => setShowRegisterIssuer(true)}
            className="px-6 py-3 text-sm font-semibold text-white transition bg-purple-600 rounded-lg shadow-md hover:bg-purple-700"
          >
            Register as Issuer (DID)
          </button>
        </div>

        <FeatureCards
          setShowUpload={setShowUpload}
          setShowVerify={setShowVerify}
          setShowExpired={setShowExpired}
          setShowRevoke={setShowRevoke}
        />
        <HistoryPanel />
        <FAQCollapse />
      </main>

      <Footer />

      {/* Modals */}
      {showUpload && <UploadModal setShowUpload={setShowUpload} />}
      {showVerify && <VerifyModal setShowVerify={setShowVerify} />}
      {showExpired && <ExpiredChecker setShowExpired={setShowExpired} />}
      {showRevoke && <RevocationPanel setShowRevoke={setShowRevoke} />}
      
      {/* FIX: Conditional render and proper props for RegisterIssuerModal */}
      {showRegisterIssuer && (
        <RegisterIssuerModal 
          isOpen={showRegisterIssuer}
          onClose={() => setShowRegisterIssuer(false)}
          walletAddress={connected ? account : null}
        />
      )}
    </div>
  );
}

export default App;









