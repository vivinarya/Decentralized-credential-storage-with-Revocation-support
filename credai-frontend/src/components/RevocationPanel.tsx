import React, { useState } from "react";
import axios from "axios";

type Props = {
  setShowRevoke: (v: boolean) => void;
};

type RevokeResult = {
  success: boolean;
  message?: string;
};

export default function RevocationPanel({ setShowRevoke }: Props) {
  const [fileHash, setFileHash] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [result, setResult] = useState<RevokeResult | null>(null);
  const [error, setError] = useState<string>("");
  const [revoking, setRevoking] = useState<boolean>(false);

  const handleRevoke = async () => {
    if (!fileHash) {
      setError("Please enter file hash");
      return;
    }
    if (!reason) {
      setError("Please provide a reason for revocation");
      return;
    }
    setRevoking(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/revoke`, {
        fileHash,
        reason,
      });      setResult({ success: true, message: res.data.message || "Revoked successfully" });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || "Revocation failed");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error while revoking");
      }
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="max-w-md p-6 space-y-4 bg-white shadow-xl rounded-xl">
        <h2 className="text-lg font-bold">Revoke Document</h2>

        <label className="block text-sm font-medium">
          File Hash (Required)
          <input
            type="text"
            value={fileHash}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFileHash(e.target.value)}
            className="w-full p-2 mt-1 border border-gray-300 rounded"
            placeholder="0x..."
          />
        </label>

        <label className="block text-sm font-medium">
          Reason for Revocation (Required)
          <textarea
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            className="w-full p-2 mt-1 border border-gray-300 rounded"
            rows={3}
            placeholder="Provide a reason..."
          />
        </label>

        {error && <div className="text-red-600">{error}</div>}
        {result && result.success && <div className="text-green-600">{result.message}</div>}

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="px-4 py-2 font-semibold text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-red-300"
          >
            {revoking ? "Revoking..." : "Revoke"}
          </button>
          <button
            onClick={() => setShowRevoke(false)}
            className="px-4 py-2 font-semibold bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}





