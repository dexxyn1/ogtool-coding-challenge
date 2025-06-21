import { ExtractionRequestListComponent } from "@/features/extractionRequest/list/ListComponent";

export default function ExtractionRequestsPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4 sm:p-6">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 mt-8">
        <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">Extraction Requests</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-3">
                A list of all submitted requests to extract knowledge from websites.
            </p>
        </div>

        <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>

        <ExtractionRequestListComponent />
      </div>
    </main>
  );
}
