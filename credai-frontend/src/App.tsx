import { useState, useEffect } from "react";
import axios from "axios";
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

  async function connectWallet() {
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

      // Authenticate user with backend
      try {
        const res = await axios.post("http://localhost:5000/api/user/auth", {
          walletAddress,
        });
        setUser(res.data.user);
        console.log("User authenticated:", res.data.user);
      } catch (err) {
        console.error("User authentication failed:", err);
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  }

  useEffect(() => {
    // Check if already connected on page load
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = (await window.ethereum.request({
            method: "eth_accounts",
          })) as string[];
          
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setConnected(true);
            
            // Authenticate with backend
            const res = await axios.post("http://localhost:5000/api/user/auth", {
              walletAddress: accounts[0],
            });
            setUser(res.data.user);
          }
        } catch (err) {
          console.error("Failed to check wallet connection:", err);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum?.on) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet();
        } else {
          setConnected(false);
          setAccount("");
          setUser(null);
        }
      });
    }

    // Cleanup function
    return () => {
      // Remove event listeners if needed
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
      
      <HeroSection setShowUpload={setShowUpload} />
      
      <FeatureCards
        setShowUpload={setShowUpload}
        setShowVerify={setShowVerify}
        setShowExpired={setShowExpired}
        setShowRevoke={setShowRevoke}
      />
      
      <HistoryPanel />
      <FAQCollapse />
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





