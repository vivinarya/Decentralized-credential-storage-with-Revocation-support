import axios from "axios";
import { useState } from "react";

type Props = { setShowVerify: (v: boolean) => void };

interface VerifyResult {
  verified: boolean;
  fileHash?: string;
  blockchain: {
    exists: boolean;
    uploader: string;
    expiration: string;
    expired: boolean;
    revoked: boolean;
  };
  database?: {
    ipfsCid: string;
    uploader: string;
    expirationDate?: string;
    revoked: boolean;
    timestamp: string;
  };
}

export default function VerifyModal({ setShowVerify }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setVerifying(true);
    setError("");

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fileBuffer = (reader.result as string).split(",")[1];
        const res = await axios.post("http://localhost:5000/api/verify", { fileBuffer });
        setResult(res.data as VerifyResult);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const errorData = err.response?.data as { error?: string };
          setError(errorData?.error || err.message || "Verification failed");
        } else {
          setError("Unknown error occurred");
        }
      } finally {
        setVerifying(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-2xl w-full mx-4 p-6 bg-white shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Verify Document</h2>
          <button
            onClick={() => setShowVerify(false)}
            className="text-3xl leading-none text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {!result ? (
          <>
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">
                Select Document to Verify
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {file && (
                <p className="mt-1 text-sm text-gray-600">Selected: {file.name}</p>
              )}
            </div>

            {error && (
              <div className="flex items-start p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                <span className="mr-2 text-red-600">⚠️</span>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {verifying && (
              <div className="flex items-center justify-center p-4 mb-4">
                <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                <p className="ml-3 text-gray-600">Verifying document...</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 px-5 py-3 font-semibold text-white transition bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleVerify}
                disabled={verifying || !file}
              >
                {verifying ? "Verifying..." : "Verify Document"}
              </button>
              <button
                className="px-5 py-3 font-semibold transition bg-gray-200 rounded-lg hover:bg-gray-300"
                onClick={() => setShowVerify(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border-2 ${
                result.verified
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <p
                className={`font-bold text-xl mb-2 ${
                  result.verified ? "text-green-800" : "text-red-800"
                }`}
              >
                {result.verified ? "✅ Document Verified" : "❌ Document Not Found"}
              </p>

              {result.blockchain.revoked && (
                <div className="p-2 mt-2 bg-red-100 border border-red-300 rounded">
                  <p className="font-semibold text-red-700">⚠️ This document has been REVOKED</p>
                </div>
              )}

              {result.blockchain.expired && (
                <div className="p-2 mt-2 bg-orange-100 border border-orange-300 rounded">
                  <p className="font-semibold text-orange-700">⏰ This document has EXPIRED</p>
                </div>
              )}
            </div>

            {result.database && (
              <div className="p-4 space-y-2 border rounded-lg bg-gray-50">
                <h3 className="mb-3 text-lg font-bold">Document Details</h3>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Uploader:</span>
                    <p className="p-2 mt-1 font-mono text-xs bg-white border rounded">
                      {result.database.uploader}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700">IPFS CID:</span>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${result.database.ipfsCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 text-xs text-blue-600 break-all hover:underline"
                    >
                      {result.database.ipfsCid}
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-gray-700">Uploaded:</span>
                      <p className="mt-1 text-xs">
                        {new Date(result.database.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {result.database.expirationDate && (
                      <div>
                        <span className="font-semibold text-gray-700">Expires:</span>
                        <p className="mt-1 text-xs">
                          {new Date(result.database.expirationDate).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                        result.database.revoked
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {result.database.revoked ? "Revoked" : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowVerify(false)}
              className="w-full px-5 py-3 font-semibold text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

