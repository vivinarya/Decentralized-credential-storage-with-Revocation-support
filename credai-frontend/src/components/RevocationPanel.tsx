import axios from "axios";
import { useState } from "react";
type Props = { setShowRevoke: (v: boolean) => void };
export default function RevocationPanel({ setShowRevoke }: Props) {
  const [fileHash, setFileHash] = useState("");
  const [msg, setMsg] = useState("");
  async function handleRevoke() {
    try {
      const res = await axios.post("http://localhost:5000/api/revoke", { fileHash });
      setMsg("Revocation:\n" + JSON.stringify(res.data, null, 2));
    } catch (err) {
      const errorMsg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || (err as { message?: string }).message
          : String(err);
      setMsg("Error: " + errorMsg);
    }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="max-w-md p-6 bg-white shadow-xl rounded-xl">
        <div className="mb-3 text-lg font-bold">Revoke Document</div>
        <input
          type="text"
          value={fileHash}
          onChange={(e) => setFileHash(e.target.value)}
          placeholder="File hash"
          className="w-full p-2 mb-3 border"
        />
        <button className="px-5 py-2 text-white bg-red-600 rounded" onClick={handleRevoke}>
          Revoke
        </button>
        <button className="px-4 py-2 ml-4 bg-gray-200 rounded" onClick={() => setShowRevoke(false)}>
          Close
        </button>
        <pre className="mt-4 text-sm text-gray-600 whitespace-pre-wrap">{msg}</pre>
      </div>
    </div>
  );
}


