import React from "react";
import type { Dispatch, SetStateAction, KeyboardEvent } from "react";

type Props = {
  setShowUpload: Dispatch<SetStateAction<boolean>>;
  setShowVerify: Dispatch<SetStateAction<boolean>>;
  setShowExpired: Dispatch<SetStateAction<boolean>>;
  setShowRevoke: Dispatch<SetStateAction<boolean>>;
};

const icons = {
  Square: (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" fill="white" />
    </svg>
  ),
  Circle: (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.8" fill="white" />
    </svg>
  ),
  Triangle: (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5.5 L19 18.5 L5 18.5 Z" stroke="currentColor" strokeWidth="1.6" fill="white" />
    </svg>
  ),
  Dot: (
    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="#ef4444" />
    </svg>
  ),
};

type Card = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  aria: string;
};

export default function FeatureCards({ setShowUpload, setShowVerify, setShowExpired, setShowRevoke }: Props) {
  const cards: Card[] = [
    { key: "upload", title: "Live Progress", subtitle: "Animated", icon: icons.Square, action: () => setShowUpload(true), aria: "Open upload dialog" },
    { key: "verify", title: "Verification", subtitle: "Blockchain", icon: icons.Circle, action: () => setShowVerify(true), aria: "Open verify dialog" },
    { key: "history", title: "Expired Files", subtitle: "History", icon: icons.Triangle, action: () => setShowExpired(true), aria: "Open expired files checker" },
    { key: "revoke", title: "Revoke Files", subtitle: "Revocation", icon: icons.Dot, action: () => setShowRevoke(true), aria: "Open revocation dialog" },
  ];

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <section className="pb-16">
      <div className="px-4 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ key, title, subtitle, icon, action, aria }, i) => (
            <article
              key={key}
              tabIndex={0}
              role="button"
              aria-label={aria}
              onClick={() => action()}
              onKeyDown={(e) => handleKeyDown(e, action)}
              className="flex flex-col items-center p-8 text-center transition shadow-sm cursor-pointer bg-gray-50 rounded-2xl hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-6">
                <div className="flex items-center justify-center w-16 h-16 text-gray-700 bg-white rounded shadow">{icon}</div>
              </div>
              <div className="mb-2 text-sm text-gray-400">{subtitle}</div>
              <div className="text-lg font-semibold sm:text-xl">{title}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}





