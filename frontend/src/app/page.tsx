import CalculatorBody from "@/components/CalculatorBody";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
        <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
            <CalculatorBody />
        </main>
    </div>
  );
}
