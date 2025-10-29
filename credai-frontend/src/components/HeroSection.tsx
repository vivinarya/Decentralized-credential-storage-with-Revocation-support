type Props = {
  setShowUpload: (v: boolean) => void;
  setShowVerify?: (v: boolean) => void;
};

export default function HeroSection({ setShowUpload }: Props) {
  return (
    <section className="pb-12 mt-24">
      <div className="max-w-4xl px-4 mx-auto text-center fade-in">
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
          Unique uploads.
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-gray-400 sm:text-2xl">
          Modern. Secure. Verified.
        </h2>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={() => setShowUpload(true)} className="btn btn-primary">
            Upload Doc
          </button>
          <button
            onClick={() => window.scrollTo({ top: document.body.scrollHeight / 3, behavior: "smooth" })}
            className="btn btn-muted"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}



