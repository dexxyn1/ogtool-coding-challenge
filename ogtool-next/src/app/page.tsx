import { ExtractionRequestCreateComponent } from "@/features/extractionRequest/create/CreateComponent";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4 sm:p-6">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 mt-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight">Extract Knowledge from Websites</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-3">
                    Provide a URL and our AI will extract the key information and save it to your knowledge base.
                </p>
            </div>

            <div className="w-full">
              <ExtractionRequestCreateComponent />
            </div>
        </div>
    </main>
  );
}
