import { useState } from "react";
const FAQS: { q: string; a: string }[] = [
  { q: "How does verification work?", a: "On-chain hashes are compared to uploaded files using keccak256." },
  { q: "Is my file stored on IPFS?", a: "Yes, files are pinned via Pinata for decentralized storage." },
  { q: "Can I revoke a credential?", a: "Yes, use the revoke panel and input file hash." },
];
export default function FAQCollapse() {
  const [open, setOpen] = useState(-1);
  return (
    <div className="max-w-3xl px-3 mx-auto my-10">
      <div className="mb-4 text-2xl font-bold">FAQs</div>
      {FAQS.map((f, i) => (
        <div key={i} className="mb-2">
          <button
            className="w-full px-4 py-2 font-semibold text-left bg-gray-100 rounded"
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            {f.q}
          </button>
          {open === i && <div className="px-4 py-2 text-gray-600 rounded-b bg-gray-50">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}
