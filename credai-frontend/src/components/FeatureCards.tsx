type Props = {
  setShowUpload: (v: boolean) => void;
  setShowVerify: (v: boolean) => void;
  setShowExpired: (v: boolean) => void;
  setShowRevoke: (v: boolean) => void;
};

const FeatureCards = ({
  setShowUpload,
  setShowVerify,
  setShowExpired,
  setShowRevoke,
}: Props) => (
  <div className="flex flex-wrap justify-center gap-8 px-4 my-12">
    {/* Upload Card */}
    <div
      className="flex flex-col items-center w-64 p-8 transition shadow cursor-pointer rounded-xl bg-gray-50 hover:bg-gray-200"
      onClick={() => setShowUpload(true)}
    >
      <div className="flex items-center justify-center w-20 h-20 mb-4 bg-white rounded shadow">
        <div className="w-12 h-12 border-4 border-black rounded"></div>
      </div>
      <div className="mt-3 text-sm text-gray-400">Animated</div>
      <div className="mt-1 text-lg font-bold">Live Progress</div>
    </div>
    {/* Verify Card */}
    <div
      className="flex flex-col items-center w-64 p-8 transition shadow cursor-pointer rounded-xl bg-gray-50 hover:bg-gray-200"
      onClick={() => setShowVerify(true)}
    >
      <div className="flex items-center justify-center w-20 h-20 mb-4 bg-white rounded shadow">
        <div className="w-12 h-12 border-4 border-black rounded-full"></div>
      </div>
      <div className="mt-3 text-sm text-gray-400">Blockchain</div>
      <div className="mt-1 text-lg font-bold">Verification</div>
    </div>
    {/* Expired Card */}
    <div
      className="flex flex-col items-center w-64 p-8 transition shadow cursor-pointer rounded-xl bg-gray-50 hover:bg-gray-200"
      onClick={() => setShowExpired(true)}
    >
      <div className="flex items-center justify-center w-20 h-20 mb-4 bg-white rounded shadow">
        <div className="w-0 h-0 border-l-8 border-r-8 border-l-transparent border-r-transparent border-b-16 border-b-black"></div>
      </div>
      <div className="mt-3 text-sm text-gray-400">History</div>
      <div className="mt-1 text-lg font-bold">Expired Files</div>
    </div>
    {/* Revoke Card */}
    <div
      className="flex flex-col items-center w-64 p-8 transition shadow cursor-pointer rounded-xl bg-gray-50 hover:bg-gray-200"
      onClick={() => setShowRevoke(true)}
    >
      <div className="flex items-center justify-center w-20 h-20 mb-4 bg-white rounded shadow">
        <div className="w-8 h-8 bg-red-600 rounded-full"></div>
      </div>
      <div className="mt-3 text-sm text-gray-400">Revocation</div>
      <div className="mt-1 text-lg font-bold">Revoke Files</div>
    </div>
  </div>
);

export default FeatureCards;



