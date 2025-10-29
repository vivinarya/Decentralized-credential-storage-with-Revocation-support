import React from "react";

type Card = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
};

const cards: Card[] = [
  {
    title: "Live Progress",
    subtitle: "Animated",
    icon: (
      <div className="flex items-center justify-center bg-white rounded shadow w-14 h-14">
        <div className="w-8 h-8 border-2 rounded-sm" />
      </div>
    ),
  },
  {
    title: "Verification",
    subtitle: "Blockchain",
    icon: (
      <div className="flex items-center justify-center bg-white rounded shadow w-14 h-14">
        <div className="w-8 h-8 border-2 rounded-full" />
      </div>
    ),
  },
  {
    title: "Expired Files",
    subtitle: "History",
    icon: (
      <div className="flex items-center justify-center bg-white rounded shadow w-14 h-14">
        <div className="w-8 h-8 bg-white border border-gray-200" />
      </div>
    ),
  },
  {
    title: "Revoke Files",
    subtitle: "Revocation",
    icon: (
      <div className="flex items-center justify-center bg-white rounded shadow w-14 h-14">
        <div className="w-6 h-6 bg-red-500 rounded-full" />
      </div>
    ),
  },
];

export default function FeatureCards() {
  return (
    <section className="pb-16">
      <div className="px-4 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <article
              key={c.title}
              className="flex flex-col items-center p-8 text-center transition transform shadow-sm fade-in-up bg-gray-50 rounded-2xl hover:shadow-lg hover:-translate-y-1"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-6">{c.icon}</div>
              <div className="mb-2 text-sm text-gray-400">{c.subtitle}</div>
              <div className="text-lg font-semibold sm:text-xl">{c.title}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}



