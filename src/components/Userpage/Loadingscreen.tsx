export default function LoadingScreen() {
  return (
    <div className="h-screen flex justify-center items-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Loading...</h1>
        <p className="text-gray-600 text-lg">
          Please wait while we fetch your session details.
        </p>
      </div>
    </div>
  );
}
