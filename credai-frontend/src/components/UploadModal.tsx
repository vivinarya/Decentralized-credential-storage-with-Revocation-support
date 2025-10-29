import axios from "axios";
import { useState } from "react";

type Props = { setShowUpload: (v: boolean) => void };

export default function UploadModal({ setShowUpload }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [result, setResult] = useState<{ fileHash?: string; ipfsCid?: string; transactionHash?: string; document?: { expirationDate?: string } } | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) {
      setError("Please select a file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    if (!window.ethereum) {
      setError("MetaMask not found");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
      if (!accounts || accounts.length === 0) {
        setError("Please connect your wallet first");
        return;
      }

      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploader", accounts[0]);

      if (expirationDate) {
        const timestamp = Math.floor(new Date(expirationDate).getTime() / 1000);
        formData.append("expirationTimestamp", timestamp.toString());
      }

      const res = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      console.log("Upload successful:", res.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data as { error?: string; errors?: Array<{ msg: string }> };
        if (Array.isArray(errorData?.errors)) {
          setError(errorData.errors.map(e => e.msg).join(", "));
        } else {
          setError(errorData?.error || err.message || "Upload failed");
        }
      } else {
        setError("Unknown error occurred");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg p-6 mx-4 bg-white shadow-2xl rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Upload Document</h2>
          <button
            onClick={() => setShowUpload(false)}
            className="text-3xl leading-none text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {!result ? (
          <>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Select File <span className="text-gray-500">(Max 10MB)</span>
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
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
                onChange={(e) => setExpirationDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
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
                disabled={uploading || !file}
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
                  <p className="p-2 mt-1 font-mono text-xs break-all bg-white border rounded">
                    {result.fileHash}
                  </p>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-700">IPFS CID:</p>
                  <p className="p-2 mt-1 font-mono text-xs break-all bg-white border rounded">
                    {result.ipfsCid}
                  </p>
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

                {result.document?.expirationDate && (
                  <div>
                    <p className="font-semibold text-gray-700">Expires:</p>
                    <p className="mt-1 text-xs">
                      {new Date(result.document.expirationDate).toLocaleString()}
                    </p>
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






