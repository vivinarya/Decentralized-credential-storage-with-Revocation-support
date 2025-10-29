import React, { useState, useEffect, useCallback } from "react";
import api from "../api";

type Props = { setShowUpload: (v: boolean) => void };

type UploadResult = {
  fileHash?: string;
  ipfsCid?: string;
  transactionHash?: string;
  verifiableCredentialId?: string;
  expirationDate?: string;
  issuerDID?: string | null;
};

type BackendError = {
  error?: string;
  errors?: { msg: string }[];
};

interface IssuerProfile {
  did: string;
  name: string;
  organization: string;
  verified: boolean;
  documentsIssued: number;
}

export default function UploadModal({ setShowUpload }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [selectedIssuerDID, setSelectedIssuerDID] = useState("");
  const [docType, setDocType] = useState("general");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [issuerProfiles, setIssuerProfiles] = useState<IssuerProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    // Get wallet address on mount
    const getWallet = async () => {
      if (window.ethereum) {
        const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      }
    };
    getWallet();
  }, []);

  const fetchIssuerProfiles = useCallback(async () => {
    if (!walletAddress) return;

    setLoadingProfiles(true);
    try {
      const response = await api.get(
        `/api/did/wallet/${walletAddress}/profiles`
      );
      
      if (response.data.success) {
        setIssuerProfiles(response.data.profiles);
        
        // Auto-select first profile if available
        if (response.data.profiles.length > 0) {
          setSelectedIssuerDID(response.data.profiles[0].did);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
      setError('Failed to load issuer profiles. Please try refreshing.');
    } finally {
      setLoadingProfiles(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchIssuerProfiles();
    }
  }, [walletAddress, fetchIssuerProfiles]);

  async function handleUpload() {
    if (!file) return setError("Please select a file");
    if (file.size > 10 * 1024 * 1024) return setError("File size must be less than 10MB");
    if (!window.ethereum) return setError("MetaMask not found");

    try {
      if (!walletAddress) {
        setError("Please connect your wallet first");
        return;
      }

      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploader", walletAddress);
      
      if (expirationDate) {
        const timestamp = Math.floor(new Date(expirationDate).getTime() / 1000);
        formData.append("expirationTimestamp", timestamp.toString());
      }
      if (selectedIssuerDID) formData.append("issuerDID", selectedIssuerDID);
      if (docType) formData.append("docType", docType);

      const res = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const payload = (res as unknown as { data?: { data?: UploadResult } }).data;
      setResult(payload?.data || (res as unknown as UploadResult));
      setError("");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object"
      ) {
        const status = (err as { response?: { status?: number } }).response?.status;
        const data = (err as { response?: { data?: BackendError } }).response?.data;

        if (status === 409) {
          setError("A document with this hash already exists.");
        } else if (status === 413) {
          setError("File is too large.");
        } else if (status === 404) {
          setError(data?.error || "Issuer not found or resource missing.");
        } else if (status === 400 && data?.errors && Array.isArray(data.errors)) {
          setError(data.errors.map(e => e.msg).join(", "));
        } else if (data?.error) {
          setError(data.error);
        } else {
          setError("Upload failed. Please check server logs.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 mx-4 bg-white shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Upload Document</h2>
          <button onClick={() => setShowUpload(false)} className="text-3xl leading-none text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        {!result ? (
          <>
            {/* Issuer Profile Selector */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Issue As <span className="text-gray-500">(Optional - for Verifiable Credentials)</span>
              </label>
              
              {loadingProfiles ? (
                <div className="p-3 text-sm text-center text-gray-500 rounded-lg bg-gray-50">
                  Loading profiles...
                </div>
              ) : issuerProfiles.length === 0 ? (
                <div className="p-4 text-sm border border-yellow-200 rounded-lg bg-yellow-50">
                  <p className="mb-2 text-yellow-800">
                    📋 You haven't created any issuer profiles yet.
                  </p>
                  <p className="text-xs text-yellow-700">
                    Create a profile to issue documents with Verifiable Credentials.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={selectedIssuerDID}
                    onChange={(e) => setSelectedIssuerDID(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  >
                    <option value="">Don't issue as organization</option>
                    {issuerProfiles.map((profile) => (
                      <option key={profile.did} value={profile.did}>
                        {profile.name} - {profile.organization}
                        {profile.verified && ' ✓'}
                      </option>
                    ))}
                  </select>
                  
                  {selectedIssuerDID && (
                    <p className="p-2 mt-2 text-xs text-green-600 rounded bg-green-50">
                      ✅ Document will be issued with a Verifiable Credential
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Select File <span className="text-gray-500">(Max 10MB)</span>
              </label>
              <input
                type="file"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                accept="image/*,application/pdf,.doc,.docx"
              />
              {file && (
                <p className="mt-1 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">
                Expiration Date <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={expirationDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpirationDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">Document Type</label>
              <select
                value={docType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDocType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="general">General</option>
                <option value="passport">Passport</option>
                <option value="certificate">Certificate</option>
                <option value="test-document">Test Document</option>
                <option value="other">Other</option>
              </select>
            </div>

            {error && (
              <div className="flex items-start p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                <span className="mr-2 text-red-600">⚠️</span>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 px-5 py-3 font-semibold text-white transition bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleUpload}
                disabled={uploading || !file || !walletAddress}
              >
                {uploading ? "Uploading..." : "Upload to Blockchain"}
              </button>
              <button
                className="px-5 py-3 font-semibold transition bg-gray-200 rounded-lg hover:bg-gray-300"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <p className="mb-3 text-lg font-bold text-green-800">✅ Upload Successful!</p>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">File Hash:</p>
                  <p className="p-2 mt-1 font-mono text-xs break-all bg-white border rounded">{result.fileHash}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">IPFS CID:</p>
                  <p className="p-2 mt-1 font-mono text-xs break-all bg-white border rounded">{result.ipfsCid}</p>
                </div>
                {result.transactionHash && (
                  <div>
                    <p className="font-semibold text-gray-700">Transaction Hash:</p>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${result.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 text-xs text-blue-600 break-all hover:underline"
                    >
                      View on Polygon Scan →
                    </a>
                  </div>
                )}
                {result.verifiableCredentialId && (
                  <div>
                    <p className="font-semibold text-gray-700">VC ID:</p>
                    <p className="p-2 mt-1 font-mono text-xs break-all bg-white border rounded">{result.verifiableCredentialId}</p>
                  </div>
                )}
                {result.expirationDate && (
                  <div>
                    <p className="font-semibold text-gray-700">Expires:</p>
                    <p className="mt-1 text-xs">{new Date(result.expirationDate).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowUpload(false)}
              className="w-full px-5 py-3 font-semibold text-white transition bg-black rounded-lg hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}





