import React, { useState } from "react";
import api from "../api";
import { ethers } from "ethers";

type Props = { setShowVerify: (v: boolean) => void };

type VerificationResult = {
  verified: boolean;
  fileHash?: string;
  document?: {
    ipfsCid: string;
    uploadedBy: string;
    uploadedAt: string;
    expirationDate?: string;
    revoked: boolean;
    revokedAt?: string | null;
  };
  blockchain?: {
    uploader: string;
    expiration: string;
    revoked: boolean;
    expired: boolean;
  };
  issuer?: {
    did: string;
    name: string;
    organization: string;
  };
  credential?: {
    id: string;
    issuanceDate: string;
    verification: {
      valid: boolean;
      checks?: Record<string, boolean>;
    };
    status: {
      revoked: boolean;
      revokedAt?: string;
    };
  };
  error?: string;
};

export default function VerifyModal({ setShowVerify }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setResult({ verified: false, error: "Failed to read file" });
      setLoading(false);
    };
    reader.onloadend = async () => {
      try {
        // Compute file hash using ethers
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const fileHash = ethers.keccak256(uint8Array);

        // Call GET /api/verify/:fileHash for full details
        const res = await api.get<VerificationResult>(`/api/verify/${fileHash}?detailed=true`);
        setResult(res.data);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const response = (err as { response?: { status?: number; data?: { error?: string } } }).response;
          if (response?.status === 404) {
            setResult({ 
              verified: false, 
              error: "Document not found in database or blockchain" 
            });
          } else {
            setResult({ 
              verified: false, 
              error: response?.data?.error || "Verification failed" 
            });
          }
        } else {
          setResult({ verified: false, error: "Unknown error" });
        }
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl p-6 mx-4 bg-white shadow-2xl rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Verify Document</h2>
          <button
            onClick={() => setShowVerify(false)}
            className="text-3xl leading-none text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium">Select File to Verify</label>
          <input
            type="file"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFile(e.target.files?.[0] || null)
            }
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handleVerify}
            disabled={!file || loading}
            className="flex-1 px-5 py-2 font-semibold text-white transition bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button
            onClick={() => setShowVerify(false)}
            className="px-5 py-2 font-semibold transition bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>

        {result && (
          <div className="p-4 overflow-y-auto border rounded-lg max-h-96">
            {result.verified ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-2xl">✅</span>
                  <span className="text-lg font-bold">Document Verified</span>
                </div>

                <div className="text-sm">
                  <p className="font-semibold text-gray-700">File Hash:</p>
                  <p className="p-2 mt-1 font-mono text-xs break-all bg-gray-100 border rounded">
                    {result.fileHash}
                  </p>
                </div>

                {result.document && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">IPFS CID:</p>
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${result.document.ipfsCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 mt-1 font-mono text-xs text-blue-600 break-all bg-gray-100 border rounded hover:underline"
                      >
                        {result.document.ipfsCid}
                      </a>
                    </div>
                    <p>
                      <span className="font-semibold">Uploaded by:</span> {result.document.uploadedBy}
                    </p>
                    <p>
                      <span className="font-semibold">Uploaded at:</span>{" "}
                      {new Date(result.document.uploadedAt).toLocaleString()}
                    </p>
                    {result.document.expirationDate && (
                      <p>
                        <span className="font-semibold">Expires:</span>{" "}
                        {new Date(result.document.expirationDate).toLocaleString()}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">Status:</span>{" "}
                      {result.document.revoked ? (
                        <span className="font-bold text-red-600">REVOKED</span>
                      ) : result.blockchain?.expired ? (
                        <span className="font-bold text-orange-600">EXPIRED</span>
                      ) : (
                        <span className="font-bold text-green-600">VALID</span>
                      )}
                    </p>
                  </div>
                )}

                {result.blockchain && (
                  <div className="p-3 border border-gray-300 rounded bg-gray-50">
                    <p className="font-semibold text-gray-900">Blockchain Status</p>
                    <p className="text-sm">
                      <span className="font-semibold">Uploader:</span> {result.blockchain.uploader}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Expiration:</span>{" "}
                      {result.blockchain.expiration}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Revoked:</span>{" "}
                      {result.blockchain.revoked ? "Yes" : "No"}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Expired:</span>{" "}
                      {result.blockchain.expired ? "Yes" : "No"}
                    </p>
                  </div>
                )}

                {result.issuer && (
                  <div className="p-3 border border-blue-200 rounded bg-blue-50">
                    <p className="font-semibold text-blue-900">Issuer Information</p>
                    <p className="text-sm">
                      <span className="font-semibold">Name:</span> {result.issuer.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Organization:</span>{" "}
                      {result.issuer.organization}
                    </p>
                    <p className="text-sm break-all">
                      <span className="font-semibold">DID:</span> {result.issuer.did}
                    </p>
                  </div>
                )}

                {result.credential && (
                  <div className="p-3 border border-purple-200 rounded bg-purple-50">
                    <p className="font-semibold text-purple-900">Verifiable Credential</p>
                    <p className="text-sm break-all">
                      <span className="font-semibold">ID:</span> {result.credential.id}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Issued:</span>{" "}
                      {new Date(result.credential.issuanceDate).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">VC Status:</span>{" "}
                      {result.credential.verification?.valid ? (
                        <span className="font-bold text-green-600">VALID</span>
                      ) : (
                        <span className="font-bold text-red-600">INVALID</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-red-700">
                <span className="text-2xl">❌</span>
                <div>
                  <p className="text-lg font-bold">Verification Failed</p>
                  <p className="text-sm">{result.error || "Document not found or invalid"}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}










