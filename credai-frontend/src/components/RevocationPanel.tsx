import { useState } from "react";
import axios from "axios";
import api from "../api";

type Props = { setShowRevoke: (v: boolean) => void };

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? "Request failed";
  }
  if (err instanceof Error) return err.message;
  try {
    return String(err);
  } catch {
    return "Unknown error";
  }
}

export default function RevocationPanel({ setShowRevoke }: Props) {
  const [fileHash, setFileHash] = useState("");
  const [msg, setMsg] = useState("");

  async function handleRevoke() {
    try {
      const revokeApiKey = (import.meta.env.VITE_REVOKE_API_KEY as string) || "";
      const headers = revokeApiKey ? { "x-api-key": revokeApiKey } : undefined;
      const res = await api.post("/api/revoke", { fileHash }, { headers });
      setMsg("Revocation:\n" + JSON.stringify(res.data, null, 2));
    } catch (err: unknown) {
      setMsg("Error: " + getErrorMessage(err));
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
        <div className="mt-2">
          <button className="px-5 py-2 text-white bg-red-600 rounded" onClick={handleRevoke}>
            Revoke
          </button>
          <button className="px-4 py-2 ml-4 bg-gray-200 rounded" onClick={() => setShowRevoke(false)}>
            Close
          </button>
        </div>
        {msg && <pre className="mt-4 text-left whitespace-pre-wrap">{msg}</pre>}
      </div>
    </div>
  );
}
