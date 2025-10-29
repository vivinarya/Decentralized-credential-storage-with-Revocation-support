import React, { useState } from "react";
import api from "../api";

type Props = { setShowExpired: (v: boolean) => void };

interface ExpiredResponse {
  expirationDate: string;
  isExpired: boolean | null;
}

interface ErrorResponse {
  error?: string;
  errors?: { msg: string }[];
}

function getErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { data?: ErrorResponse } }).response?.data
  ) {
    const data = (err as { response?: { data?: ErrorResponse } }).response!.data!;
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map(e => e.msg).join(", ");
    }
    return data.error ?? "Request failed";
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
    if (!file) {
      setMsg("Please select a file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setMsg("File too large (max 5 MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fileBuffer = (reader.result as string).split(",")[1];
        const res = await api.post<ExpiredResponse>("/api/expired", { fileBuffer });
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
        <input
          type="file"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
          className="w-full p-2 border border-gray-300 rounded-lg"
        />
        <div className="mt-4">
          <button 
            className="px-5 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400" 
            onClick={handleExpired}
            disabled={!file}
          >
            Check
          </button>
          <button
            className="px-4 py-2 ml-4 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => setShowExpired(false)}
          >
            Close
          </button>
        </div>
        {msg && (
          <div className="p-3 mt-4 bg-gray-100 rounded-lg">
            <pre className="text-sm text-left whitespace-pre-wrap">{msg}</pre>
          </div>
        )}
      </div>
    </div>
  );
}










