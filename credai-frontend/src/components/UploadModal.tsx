import axios from "axios";
import { useState } from "react";
type Props = { setShowUpload: (v: boolean) => void };
export default function UploadModal({ setShowUpload }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  async function handleUpload() {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg("Upload Success: " + JSON.stringify(res.data));
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
        <div className="mb-3 text-lg font-bold">Upload Document</div>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-3" />
        <button className="px-5 py-2 text-white bg-black rounded" onClick={handleUpload}>
          Upload
        </button>
        <button className="px-4 py-2 ml-4 bg-gray-200 rounded" onClick={() => setShowUpload(false)}>
          Close
        </button>
        <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap">{msg}</div>
      </div>
    </div>
  );
}


