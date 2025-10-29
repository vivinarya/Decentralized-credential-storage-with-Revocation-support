import { useEffect, useState } from "react";
import api from "../api";

type HistoryItem = {
  fileHash: string;
  createdAt?: string;
  revoked?: boolean;
};

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    api
      .get("/api/history")
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
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.fileHash}>
                  <td className="px-4 py-2 break-all">{h.fileHash}</td>
                  <td className="px-4 py-2">{h.revoked ? "Revoked" : "Active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


