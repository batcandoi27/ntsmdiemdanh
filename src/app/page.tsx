import DashboardContent from "@/components/dashboard/dashboard-content";

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-12">
                <h1 className="text-2xl md:text-4xl font-bold text-primary-dark mb-4">
                    Hệ Thống Điểm Danh
                </h1>
                <p className="text-base md:text-xl text-gray-600">
                    Trường THCS Trần Bội Cơ
                </p>
            </div>

            <DashboardContent />

            <div className="mt-12 text-sm text-gray-400">
                Phiên bản 02.2026 | Mode: {process.env.NEXT_PUBLIC_USE_SUPABASE === 'true' ? 'Supabase Online' : (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Firebase Online' : 'Local Offline')}
            </div>
        </main>
    );
}
