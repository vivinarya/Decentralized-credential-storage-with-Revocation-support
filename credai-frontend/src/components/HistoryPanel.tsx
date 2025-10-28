import { useEffect, useState } from "react";
import axios from "axios";

interface HistoryItem {
  // Define expected properties here, example:
  id: string;
  filename: string;
  timestamp: string;
  [key: string]: unknown; // fallback additional props
}

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/history").then((res) => setHistory(res.data.history ?? []));
  }, []);

  return (
    <div className="max-w-4xl p-6 mx-auto mt-8 mb-8 shadow bg-gray-50 rounded-xl">
      <div className="mb-2 text-xl font-bold">Recent Files</div>
      <ul className="mt-2">
        {history.length === 0 && <div className="text-gray-500">No history yet.</div>}
        {history.map((h, i) => (
          <li key={i} className="px-3 py-1 text-sm border-b border-gray-200">
            {JSON.stringify(h)}
          </li>
        ))}
      </ul>
    </div>
  );
}

