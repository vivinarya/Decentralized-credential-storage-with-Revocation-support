type Props = {
  setShowUpload: (v: boolean) => void;
};
export default function HeroSection({ setShowUpload }: Props) {
  return (
    <section className="my-20 text-center">
      <h1 className="mb-2 text-4xl font-black sm:text-5xl">Unique uploads.</h1>
      <h2 className="mb-6 text-2xl font-bold text-gray-400">Modern. Secure. Verified.</h2>
      <button
        onClick={() => setShowUpload(true)}
        className="px-6 py-2 mr-2 font-semibold text-white transition bg-black rounded shadow hover:bg-gray-900"
      >
        Upload Doc
      </button>
      <button className="px-6 py-2 font-semibold text-gray-800 bg-gray-100 rounded shadow">Learn More</button>
    </section>
  );
}

