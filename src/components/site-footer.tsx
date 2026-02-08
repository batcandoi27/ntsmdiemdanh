import Link from 'next/link';

export function SiteFooter() {
    return (
        <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="hidden md:grid md:grid-cols-3 gap-8">
                    {/* Brand Info */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            THCS Trần Bội Cơ
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Hệ thống quản lý điểm danh và nề nếp học sinh. <br />
                            Xây dựng môi trường giáo dục tích cực và hiện đại.
                        </p>
                    </div>

                    {/* Quick Link */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            Liên Kết
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">
                                    Website nhà trường
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">
                                    Cổng thông tin điện tử
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">
                                    Liên hệ hỗ trợ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Meta */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            Phiên bản
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            System Status: Online
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Version 2.5.0 (Build 20260201) <br />
                            Powered by Antigravity AI
                        </p>
                    </div>
                </div>

                <div className="md:mt-8 md:pt-8 md:border-t md:border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 pt-2">
                    <p>&copy; 2026 THCS Trần Bội Cơ. All rights reserved.</p>
                    <div className="flex gap-4">
                        <Link href="#" className="hover:text-gray-600">Privacy Policy</Link>
                        <Link href="#" className="hover:text-gray-600">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
