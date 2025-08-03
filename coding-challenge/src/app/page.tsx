import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Job Application Portal
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Welcome to our application system. Submit your application and receive
          a professional PDF summary.
        </p>
        <Link
          href="/apply"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Start Application
        </Link>
      </div>
    </div>
  );
}
