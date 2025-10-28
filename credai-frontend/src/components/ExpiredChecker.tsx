import axios from "axios";
import { useState } from "react";
type Props = { setShowExpired: (v: boolean) => void };
export default function ExpiredChecker({ setShowExpired }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const handleExpired = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fileBase64 = (reader.result as string).split(",")[1];
        const res = await axios.post("http://localhost:5000/api/expired", { fileBase64 });
        setMsg("OCR Expiry:\n" + JSON.stringify(res.data, null, 2));
      } catch (err) {
        const errorMsg =
          typeof err === "object" && err !== null && "response" in err
            ? (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || (err as { message?: string }).message
            : String(err);
        setMsg("Error: " + errorMsg);
      }
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="max-w-md p-6 bg-white shadow-xl rounded-xl">
        <div className="mb-3 text-lg font-bold">Expired Document Check</div>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-3" />
        <button className="px-5 py-2 text-white bg-purple-600 rounded" onClick={handleExpired}>
          Check Expiry
        </button>
        <button className="px-4 py-2 ml-4 bg-gray-200 rounded" onClick={() => setShowExpired(false)}>
          Close
        </button>
        <pre className="mt-4 text-sm text-gray-600 whitespace-pre-wrap">{msg}</pre>
      </div>
    </div>
  );
}

