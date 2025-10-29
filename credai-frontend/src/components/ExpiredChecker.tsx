import { useState } from "react";
import axios from "axios";
import api from "../api";

type Props = { setShowExpired: (v: boolean) => void };

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

export default function ExpiredChecker({ setShowExpired }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");

  const handleExpired = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fileBuffer = (reader.result as string).split(",")[1];
        if (fileBuffer.length > 5 * 1024 * 1024) {
          setMsg("File too large");
          return;
        }
        const res = await api.post("/api/expired", { fileBuffer });

        const { expirationDate, isExpired } = res.data;
        setMsg(
          `Expiration Date: ${expirationDate ? new Date(expirationDate).toLocaleString() : "Not set"}\n` +
            `Status: ${isExpired ? "EXPIRED" : isExpired === null ? "No expiration set" : "VALID"}`
        );
      } catch (err: unknown) {
        setMsg("Error: " + getErrorMessage(err));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="max-w-md p-6 bg-white shadow-xl rounded-xl">
        <div className="mb-3 text-lg font-bold">Check Expiration</div>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="mt-4">
          <button className="px-5 py-2 text-white bg-blue-600 rounded" onClick={handleExpired}>
            Check
          </button>
          <button className="px-4 py-2 ml-4 bg-gray-200 rounded" onClick={() => setShowExpired(false)}>
            Close
          </button>
        </div>
        {msg && <pre className="mt-4 text-left whitespace-pre-wrap">{msg}</pre>}
      </div>
    </div>
  );
}

