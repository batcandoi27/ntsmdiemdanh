import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Đang tải dữ liệu...
                </h2>
                <p className="text-sm text-gray-500 mt-2">Vui lòng đợi trong giây lát</p>
            </div>
        </div>
    );
}
