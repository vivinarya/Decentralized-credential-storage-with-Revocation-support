import { useState } from "react";
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

// Declare ethereum type for window
interface EthereumProvider {
  request: (args: { method: string }) => Promise<unknown>;
  isMetaMask?: boolean;
}
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function App() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not found! Please install");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts[0]);
      setConnected(true);
    } catch {
      alert("Connection failed!");
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white font-inter">
      <Header connected={connected} account={account} connectWallet={connectWallet} />
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

      {showUpload && <UploadModal setShowUpload={setShowUpload} />}
      {showVerify && <VerifyModal setShowVerify={setShowVerify} />}
      {showExpired && <ExpiredChecker setShowExpired={setShowExpired} />}
      {showRevoke && <RevocationPanel setShowRevoke={setShowRevoke} />}
    </div>
  );
}

export default App;


