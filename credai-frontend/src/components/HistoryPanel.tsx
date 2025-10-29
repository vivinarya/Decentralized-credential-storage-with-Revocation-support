import { useEffect, useState } from "react";
import axios from "axios";

interface HistoryItem {
  fileHash: string;
  ipfsCid: string;
  uploader?: string;
  expirationDate?: string;
  revoked: boolean;
  timestamp: string;
}

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/history")
      .then((res) => setHistory(res.data.history ?? []))
      .catch((err) => console.error("Failed to fetch history:", err));
  }, []);

  return (
    <div className="max-w-4xl p-6 mx-auto mt-8 mb-8 shadow bg-gray-50 rounded-xl">
      <div className="mb-2 text-xl font-bold">Recent Files</div>
      <div className="overflow-x-auto">
        {history.length === 0 && <div className="text-gray-500">No history yet.</div>}
        {history.length > 0 && (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-200">
              <tr>
                <th className="px-4 py-2">File Hash</th>
                <th className="px-4 py-2">IPFS CID</th>
                <th className="px-4 py-2">Expiration</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">{h.fileHash.slice(0, 10)}...</td>
                  <td className="px-4 py-2 font-mono text-xs">{h.ipfsCid.slice(0, 10)}...</td>
                  <td className="px-4 py-2">
                    {h.expirationDate
                      ? new Date(h.expirationDate).toLocaleDateString()
                      : "No expiry"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        h.revoked ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"
                      }`}
                    >
                      {h.revoked ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{new Date(h.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


