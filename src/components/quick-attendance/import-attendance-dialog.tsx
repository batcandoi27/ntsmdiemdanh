"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { UploadCloud, CheckCircle2, AlertTriangle, X, PlusCircle, Trash2, FileJson, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import toast from "react-hot-toast";

import { getStudentsForClasses, processImportedAttendance, ImportAttendanceRecord } from "@/app/actions/import-attendance";
import { AttendanceStatusV3 } from "@/types/attendance-v3";
import { SessionType } from "@/types/timetable";

// Types
type JsonStudent = { name: string; status: AttendanceStatusV3; note: string };
type JsonClass = { className: string; totalStudents: number | null; absentCount: number; students: JsonStudent[] };
type JsonRecord = { date: string; session: SessionType; classes: JsonClass[] };

type MatchedStudent = {
    id: string; // Internal id (uuid or random) for React keys
    studentId: string; // DB code
    studentName: string; // DB name
    originalNameStr: string; // From JSON
    status: AttendanceStatusV3;
    note: string;
    isMatched: boolean;
    suggestedMatches?: any[];
};

type ProcessedClass = {
    classId: string;
    className: string;
    jsonAbsentCount: number;
    matchedStudents: MatchedStudent[];
    allClassStudents: any[]; // DB data for manual adding
    hasMissingWarning?: boolean;
};

type ProcessedRecord = {
    date: string;
    session: SessionType;
    classes: ProcessedClass[];
};

interface ImportAttendanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

// Simple fuzzy search helper for Vietnamese names
function normalizeVietnamese(str: string) {
    if (!str) return "";
    return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D")
        .replace(/\./g, " ")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function computeMatchScore(query: string, targetName: string) {
    const normQ = normalizeVietnamese(query);
    const normT = normalizeVietnamese(targetName);
    const qParts = normQ.split(" ").filter(Boolean);
    const tParts = normT.split(" ").filter(Boolean);

    if (qParts.length === 0 || tParts.length === 0) return 0;

    const qStr = qParts.join(" ");
    const tStr = tParts.join(" ");

    // 1. Exact Name String Match (e.g. JSON: "Huynh Thuc Uyen", DB: "Huynh Thuc Uyen")
    if (qStr === tStr) return 100;

    let score = 0;

    // We treat the LAST word in query as the primary "Name" 
    // unless it gets absorbed into abbreviation logic
    let lastQ = qParts[qParts.length - 1];
    const lastT = tParts[tParts.length - 1];

    let queryWordsToMatchByValue = [...qParts];

    // 2. Exact Last Word Match (Extremely important in Vietnamese names)
    if (lastQ === lastT) {
        score += 50;
    } else {
        // Weak match if substring
        if (lastT.includes(lastQ) || lastQ.includes(lastT)) {
            score += 20;
        }
    }

    // 3. Advanced Abbreviation Logic ("P.Linh", "H. Ha", "T. G. Han", "Ng. Han")
    // We look at all query parts BEFORE the last name.
    // If they look like initials (length 1 or 2), we try to align them with target's middle/first names.
    let isAbbrMatched = false;
    let initialScoreBoost = 0;

    if (qParts.length > 1 && lastQ === lastT) {
        const initials = qParts.slice(0, -1);
        let targetPrefixes = tParts.slice(0, -1);

        let allInitialsMatched = true;
        let tIndex = 0;

        for (const init of initials) {
            let foundMatch = false;
            // E.g: init="ng", we look for "nguyen" "ngo" "ngoc"
            for (let i = tIndex; i < targetPrefixes.length; i++) {
                if (targetPrefixes[i].startsWith(init)) {
                    foundMatch = true;
                    tIndex = i + 1; // Move forward, preserve order

                    // Boost based on proximity to the end name
                    // e.g. target is [A, B, C, D] (length 4). C is closest to D (index 2).
                    // If targetPrefixes.length is 3, index 2 is max.
                    if (i === targetPrefixes.length - 1) {
                        initialScoreBoost += 40; // Immediate neighbor
                    } else if (i === targetPrefixes.length - 2) {
                        initialScoreBoost += 20; // 1 step away
                    } else {
                        initialScoreBoost += 10; // further away
                    }
                    break;
                }
            }
            if (!foundMatch) {
                allInitialsMatched = false;
                break;
            }
        }

        if (allInitialsMatched) {
            isAbbrMatched = true;
            score += initialScoreBoost;
            queryWordsToMatchByValue = [lastQ]; // Consume the initials, don't word-match them later
        }
    }

    // 3b. Concatenated Initials Fallback (e.g. "mtien" -> "minh tien")
    if (!isAbbrMatched && qParts.length === 1 && lastQ.length > 2 && lastQ.endsWith(lastT) && lastQ.length <= lastT.length + 2) {
        let potentialPrefix = lastQ.slice(0, lastQ.length - lastT.length);
        if (potentialPrefix.length <= 2) { // 1 or 2 letters like 'm' or 'ng'
            for (let i = 0; i < tParts.length - 1; i++) {
                if (tParts[i].startsWith(potentialPrefix)) {
                    isAbbrMatched = true;
                    // Retroactively add 50 points because lastQ ends with lastT meaning the name matched
                    score += 50;
                    const distanceScore = (i === tParts.length - 2) ? 40 : 20;
                    score += distanceScore;
                    queryWordsToMatchByValue = []; // Consumed
                    break;
                }
            }
        }
    }

    // 4. Word-by-Word Component Match (For non-consumed parts)
    // Works perfectly for things like "Ho Bao" -> "Nguyen Ho Gia Bao"
    if (!isAbbrMatched && queryWordsToMatchByValue.length > 0) {
        let matchedWords = 0;
        let orderedMatchMatches = 0;

        let lastMatchedIndex = -1;

        for (const q of queryWordsToMatchByValue) {
            const foundIdx = tParts.indexOf(q);
            if (foundIdx !== -1) {
                matchedWords++;
                if (foundIdx > lastMatchedIndex) {
                    orderedMatchMatches++;
                    lastMatchedIndex = foundIdx;
                }
            }
        }

        // Exact Sub-array Match (e.g. "thuc uyen" in "huynh thuc uyen")
        if (tStr.includes(qStr) && queryWordsToMatchByValue.length > 1) {
            score += 40;
        } else {
            // Proportional match based on ordered matched words
            score += (orderedMatchMatches / Math.max(queryWordsToMatchByValue.length, tParts.length)) * 40;
        }

        // Boost if ALL query words exist exactly in the target (e.g. "Ho Bao" in "Nguyen Ho Gia Bao")
        if (queryWordsToMatchByValue.length < tParts.length && matchedWords === queryWordsToMatchByValue.length) {
            let baseBoost = 50; // High boost to guarantee threshold
            score += baseBoost;
        }
    }

    return Math.min(score, 100);
}

export function ImportAttendanceDialog({ open, onOpenChange, onSuccess }: ImportAttendanceDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<"upload" | "processing" | "review" | "saving">("upload");
    const [activeTab, setActiveTab] = useState<"issues" | "resolved">("issues");
    const [processedData, setProcessedData] = useState<ProcessedRecord[]>([]);

    // Reset state when opening
    if (!open && step !== "upload") {
        setTimeout(() => {
            setStep("upload");
            setProcessedData([]);
        }, 300);
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setStep("processing");
            const text = await file.text();
            let json: JsonRecord[];
            try {
                json = JSON.parse(text);
                if (!Array.isArray(json)) throw new Error("JSON must be an array of records.");
            } catch (err) {
                toast.error("File JSON không hợp lệ.");
                setStep("upload");
                return;
            }

            // Extract all class names to fetch from DB
            const classNamesSet = new Set<string>();
            json.forEach(r => r.classes.forEach(c => classNamesSet.add(c.className)));

            // Note: DB returns classes by their ID (e.g., '6A1'). 
            // In our system, usually ID === name for classes like '6A1', '7A10'.
            const classIdsToFetch = Array.from(classNamesSet);
            const studentsRes = await getStudentsForClasses(classIdsToFetch);

            if (!studentsRes.success || !studentsRes.data) {
                toast.error("Lỗi khi tải danh sách học sinh từ Server");
                setStep("upload");
                return;
            }

            const dbData = studentsRes.data; // { '6A1': [ {code, fullName, firstName}... ] }

            // Process and match
            const finalData: ProcessedRecord[] = json.map(record => {
                const pClasses: ProcessedClass[] = record.classes.map(cls => {
                    const classStudentsDb = dbData[cls.className] || [];

                    const matchedStudents: MatchedStudent[] = cls.students.map(s => {
                        let theCandidates: { dbS: any, score: number }[] = [];

                        // Fuzzy Search
                        classStudentsDb.forEach(dbS => {
                            const score = computeMatchScore(s.name, dbS.fullName);
                            if (score >= 30) { // Lower base Threshold to collect more potential candidates
                                theCandidates.push({ dbS, score });
                            }
                        });

                        theCandidates.sort((a, b) => b.score - a.score);

                        let bestMatch: any = null;
                        let isMatched = false;

                        if (theCandidates.length > 0) {
                            if (theCandidates.length === 1) {
                                // If there's only 1 candidate over threshold, accept if it's decently scored
                                if (theCandidates[0].score >= 40) {
                                    bestMatch = theCandidates[0].dbS;
                                    isMatched = true;
                                }
                            } else {
                                // Multiple candidates: Check if the top one is significantly better
                                // or if the top one is an almost perfect match (e.g >= 80)
                                const topScore = theCandidates[0].score;
                                const secondScore = theCandidates[1].score;

                                if (topScore >= 80 && topScore > secondScore) {
                                    // Extremely high confidence, accept even if close
                                    bestMatch = theCandidates[0].dbS;
                                    isMatched = true;
                                } else if (topScore >= 40 && topScore >= secondScore + 10) {
                                    // Good confidence, clear winner
                                    bestMatch = theCandidates[0].dbS;
                                    isMatched = true;
                                } else {
                                    bestMatch = null; // Ambiguous, fallback to suggestions
                                    isMatched = false;
                                }
                            }
                        }

                        // Generate suggestions up to 3 options
                        let suggestedMatches: any[] = [];
                        if (!isMatched) {
                            suggestedMatches = theCandidates.slice(0, 3).map(c => c.dbS);
                        }

                        return {
                            id: Math.random().toString(36).substring(7),
                            studentId: bestMatch ? bestMatch.code : "",
                            studentName: bestMatch ? bestMatch.fullName : s.name,
                            originalNameStr: s.name,
                            status: s.status,
                            note: s.note,
                            isMatched,
                            suggestedMatches
                        };
                    });

                    // Add dummy rows if JSON total absent count > actually parsed names
                    const missingCount = (cls.absentCount || 0) - cls.students.length;
                    let hasMissingWarning = false;
                    if (missingCount > 0) {
                        hasMissingWarning = true;
                        for (let i = 0; i < missingCount; i++) {
                            matchedStudents.push({
                                id: Math.random().toString(36).substring(7),
                                studentId: "",
                                studentName: "Chọn từ danh sách",
                                originalNameStr: "??????????",
                                status: "absent",
                                note: "",
                                isMatched: false,
                                suggestedMatches: []
                            });
                        }
                    }

                    return {
                        classId: cls.className,
                        className: cls.className,
                        jsonAbsentCount: cls.absentCount,
                        matchedStudents,
                        allClassStudents: classStudentsDb,
                        hasMissingWarning
                    };
                }).sort((a, b) => {
                    // Bubble up classes with warnings
                    const aWarns = a.matchedStudents.filter(s => !s.isMatched).length + (a.hasMissingWarning ? 1 : 0);
                    const bWarns = b.matchedStudents.filter(s => !s.isMatched).length + (b.hasMissingWarning ? 1 : 0);
                    return bWarns - aWarns;
                });
                return {
                    date: record.date,
                    session: record.session,
                    classes: pClasses
                };
            });

            setProcessedData(finalData);
            setStep("review");
            if (fileInputRef.current) fileInputRef.current.value = ""; // reset
        } catch (error) {
            console.error(error);
            toast.error("Đã có lỗi xảy ra khi xử lý file");
            setStep("upload");
        }
    };

    const handleSave = async () => {
        // Validation check
        let hasUnmatched = false;
        processedData.forEach(r => r.classes.forEach(c => {
            if (c.matchedStudents.some(s => !s.isMatched)) hasUnmatched = true;
        }));

        if (hasUnmatched) {
            toast.error("Vui lòng xử lý (chọn tên đúng hoặc xóa) các học sinh không khớp tên trước khi lưu.");
            return;
        }

        setStep("saving");
        const payload: ImportAttendanceRecord[] = processedData.map(r => ({
            date: r.date,
            session: r.session,
            classId: r.classes[0]?.classId, // Need to unroll: payload requires array of ImportAttendanceRecord where each is one class?
            // Wait, ImportAttendanceRecord in Server Action maps to one class per record, but our UI groups them differently if 1 `json record` = many classes?
            // Let's adapt the payload construction. The Server Action `processImportedAttendance` expects an array of `{date, session, classId, studentsToUpdate}`
            // We need to flatten.
            studentsToUpdate: []
        })).filter(() => false); // Disable TS complain while rebuilding payload

        const flatPayload: ImportAttendanceRecord[] = [];
        processedData.forEach(r => {
            r.classes.forEach(c => {
                flatPayload.push({
                    date: r.date,
                    session: r.session,
                    classId: c.classId,
                    studentsToUpdate: c.matchedStudents.map(s => ({
                        studentId: s.studentId,
                        studentName: s.studentName,
                        status: s.status,
                        note: s.note
                    }))
                });
            });
        });

        const res = await processImportedAttendance(flatPayload);
        if (res.success) {
            toast.success(res.message);
            onOpenChange(false);
            onSuccess?.();
            setStep("upload");
        } else {
            toast.error(res.message);
            setStep("review");
        }
    };

    const removeStudent = (recordIdx: number, classIdx: number, studentId: string) => {
        const newData = [...processedData];
        const cls = newData[recordIdx].classes[classIdx];
        cls.matchedStudents = cls.matchedStudents.filter(s => s.id !== studentId);
        setProcessedData(newData);
    };

const addNewStudent = (recordIdx: number, classIdx: number) => {
    // Just add an empty unmatched slot
    const newData = [...processedData];
    const cls = newData[recordIdx].classes[classIdx];
    cls.matchedStudents.push({
        id: Math.random().toString(36).substring(7),
        studentId: "",
        studentName: "Chọn từ danh sách",
        originalNameStr: "Thêm thủ công",
        status: "absent",
        note: "",
        isMatched: false,
        suggestedMatches: []
    });
    setProcessedData(newData);
};

// Calculate total validation warnings
let totalWarnings = 0;
const classesWithIssues: Array<{ recordIdx: number, classIdx: number }> = [];
const warningClasses: string[] = [];
if (step === "review") {
    processedData.forEach((r, rIdx) => r.classes.forEach((c, cIdx) => {
        let classWarns = 0;
        // Only check if there's any unmatched student in the UI
        c.matchedStudents.forEach(s => {
            if (!s.isMatched) classWarns++;
        });
        if (classWarns > 0) {
            totalWarnings += classWarns;
            classesWithIssues.push({ recordIdx: rIdx, classIdx: cIdx });
            if (!warningClasses.includes(c.className)) warningClasses.push(c.className);
        }
    }));
}

return (
    <Dialog open={open} onOpenChange={(v) => {
        if (step === "saving") return;
        onOpenChange(v);
    }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-1 overflow-hidden bg-gray-50/95 border-gray-200">
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2 text-indigo-900 border-none font-black tracking-tight">
                        <FileJson className="w-5 h-5 text-indigo-500" />
                        Import JSON Điểm Danh (Từ AI)
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 font-medium pt-1">
                        Tự động đọc file JSON, đối chiếu danh sách lớp và gợi ý dữ liệu.
                        Có thể tinh chỉnh thủ công trước khi chốt lưu.
                    </DialogDescription>
                </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {step === "upload" && (
                    <div
                        className="border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 transition-colors p-12 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[400px]"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="p-4 bg-white rounded-full shadow-sm">
                            <UploadCloud className="w-10 h-10 text-indigo-500" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-gray-800 text-lg mb-1">Click để tải lên file .json</p>
                            <p className="text-sm text-gray-500 font-medium">Hoặc kéo thả file vào khu vực này</p>
                        </div>
                        <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>
                )}

                {step === "processing" && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-indigo-900 font-bold">Đang xử lý file và khớp đối tượng...</p>
                    </div>
                )}

                {step === "review" && (
                    <div className="space-y-6 pb-10">
                        <div className="flex p-1 bg-gray-100/80 rounded-xl border border-gray-200 shadow-inner">
                            <button
                                onClick={() => setActiveTab("issues")}
                                className={`flex-1 py-3 px-4 font-bold text-sm lg:text-base rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${activeTab === "issues" ? 'bg-white text-red-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Cần Xử Lý ({classesWithIssues.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("resolved")}
                                className={`flex-1 py-3 px-4 font-bold text-sm lg:text-base rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${activeTab === "resolved" ? 'bg-white text-green-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Đã Hoàn Tất ({processedData.reduce((acc, r) => acc + r.classes.length, 0) - classesWithIssues.length})
                            </button>
                        </div>

                        {totalWarnings === 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-6 md:p-8 flex flex-col items-center justify-center text-center gap-2 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <CheckCircle2 className="w-48 h-48 text-green-800" />
                                </div>
                                <CheckCircle2 className="w-16 h-16 text-green-500 mb-2 relative z-10 animate-bounce" />
                                <h4 className="font-black text-green-800 text-2xl relative z-10">Tuyệt vời! Tất cả đã khớp</h4>
                                <p className="text-green-700 font-medium max-w-lg mt-2 relative z-10 text-base">
                                    Không còn dữ liệu lỗi. Hệ thống điểm danh đã sẵn sàng, bạn hoàn toàn có thể nhấn nút Đồng ý & Lưu để import thẳng bộ dữ liệu nguyên bản này.
                                </p>
                            </div>
                        )}

                        {totalWarnings > 0 && activeTab === "issues" && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-amber-800">Lỗi: Tên hoặc Số lượng không khớp</h4>
                                    <p className="text-sm text-amber-700 font-medium mt-1">
                                        Có <span className="font-bold">{totalWarnings}</span> điểm nghi ngờ tại các lớp: <span className="font-bold text-amber-900">{warningClasses.join(", ")}</span>. Dữ liệu sẽ không thể Import cho tới khi bạn xử lý xong!
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === "issues" && totalWarnings === 0 && classesWithIssues.length === 0 && (
                            <div className="text-center py-10 opacity-70">
                                <p className="font-bold text-gray-500">Mọi thứ đã xong ở Tab "Cần xử lý". Bấm chuyển tab!</p>
                            </div>
                        )}

                        {processedData.map((record, rIdx) => {
                            const filteredClasses = record.classes.filter((c, cIdx) => {
                                const hasIssue = classesWithIssues.some(iss => iss.recordIdx === rIdx && iss.classIdx === cIdx);
                                return activeTab === "issues" ? hasIssue : !hasIssue;
                            });

                            if (filteredClasses.length === 0) return null;

                            return (
                                <div key={rIdx} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-slate-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                                            {format(new Date(record.date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                                            <span className="text-sm font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full ml-2">
                                                Ca {record.session === 'morning' ? 'Sáng' : 'Chiều'}
                                            </span>
                                        </h3>
                                    </div>

                                    <div className="p-5 space-y-5">
                                        {filteredClasses.map((cls) => {
                                            const cIdx = record.classes.findIndex(c => c.classId === cls.classId);
                                            const isCountMismatch = cls.jsonAbsentCount !== cls.matchedStudents.length;
                                            return (
                                                <div key={cIdx} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="font-black text-lg text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg">
                                                                {cls.className}
                                                            </div>
                                                            <div className="flex gap-2 text-sm font-semibold">
                                                                <span className="px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-600">
                                                                    JSON báo vắng: <span className="text-gray-900">{cls.jsonAbsentCount}</span>
                                                                </span>
                                                                <span className={`px-2 py-1 border rounded-md ${isCountMismatch ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                                                    Thực nhận: <span>{cls.matchedStudents.length}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => addNewStudent(rIdx, cIdx)} className="flex items-center px-3 rounded-md border h-8 font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                                            <PlusCircle className="w-4 h-4 mr-1.5" />
                                                            Thêm Học Sinh
                                                        </button>
                                                    </div>

                                                    {cls.matchedStudents.length === 0 ? (
                                                        <div className="text-center py-4 text-sm font-medium text-gray-500">
                                                            Lớp không có học sinh vắng trong biên bản ảnh.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {cls.matchedStudents.map((s, sIdx) => (
                                                                <div key={s.id} className={`flex ${!s.isMatched ? 'items-start pt-3' : 'items-center'} gap-3 p-2.5 rounded-lg border ${s.isMatched ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                                                                    {!s.isMatched ? (
                                                                        <div className="flex-1 flex flex-col gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                                                <span className="text-sm font-bold text-red-700 w-1/4 truncate" title="Tên từ ảnh">
                                                                                    "{s.originalNameStr}"
                                                                                </span>
                                                                                <div className="flex-1 relative">
                                                                                    <select
                                                                                        className="w-full h-8 px-3 text-sm font-bold border border-red-200 rounded-md bg-white text-blue-700 hover:text-blue-800 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none outline-none hover:bg-blue-50 transition-colors shadow-sm"
                                                                                        value=""
                                                                                        onChange={(e) => resolveStudent(rIdx, cIdx, s.id, e.target.value)}
                                                                                    >
                                                                                        <option value="" disabled>-- Chọn tên HS --</option>
                                                                                        {cls.allClassStudents.map(dbs => (
                                                                                            <option key={dbs.code} value={dbs.code} className="text-gray-900 font-medium bg-white">{dbs.fullName}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-red-400">
                                                                                        <PlusCircle className="w-4 h-4" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {s.suggestedMatches && s.suggestedMatches.length > 0 && (
                                                                                <div className="flex items-start gap-2 pl-6 pb-1">
                                                                                    <span className="text-xs text-red-500/70 font-semibold mt-1 flex-shrink-0">Gợi ý:</span>
                                                                                    <div className="flex gap-2 flex-wrap">
                                                                                        {s.suggestedMatches.map((sug: any) => (
                                                                                            <button
                                                                                                key={sug.code}
                                                                                                onClick={() => resolveStudent(rIdx, cIdx, s.id, sug.code)}
                                                                                                className="px-2.5 py-1 text-xs font-bold bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 hover:border-blue-500 transition-colors shadow-sm"
                                                                                            >
                                                                                                {sug.fullName}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex-1 flex items-center gap-2">
                                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                            <span className="text-sm font-black text-gray-800 flex-1">{s.studentName}</span>
                                                                        </div>
                                                                    )}

                                                                    <div className="w-32">
                                                                        <select
                                                                            className="w-full h-8 px-2 text-xs font-bold rounded-md bg-white text-blue-700 border border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer"
                                                                            value={s.status}
                                                                            onChange={(e) => {
                                                                                const newData = [...processedData];
                                                                                newData[rIdx].classes[cIdx].matchedStudents[sIdx].status = e.target.value as any;
                                                                                setProcessedData(newData);
                                                                            }}
                                                                        >
                                                                            <option value="absent">Không Phép</option>
                                                                            <option value="excused">Có Phép</option>
                                                                            <option value="late">Trễ</option>
                                                                            <option value="violation">Vi Phạm</option>
                                                                        </select>
                                                                    </div>

                                                                    <div className="w-40">
                                                                        <input
                                                                            type="text"
                                                                            className="w-full h-8 px-2 text-xs font-medium rounded-md bg-gray-50 border border-gray-200"
                                                                            placeholder="Ghi chú (nhà có tang...)"
                                                                            value={s.note}
                                                                            onChange={(e) => {
                                                                                const newData = [...processedData];
                                                                                newData[rIdx].classes[cIdx].matchedStudents[sIdx].note = e.target.value;
                                                                                setProcessedData(newData);
                                                                            }}
                                                                        />
                                                                    </div>

                                                                    <button
                                                                        className="flex items-center justify-center rounded-md h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                        onClick={() => removeStudent(rIdx, cIdx, s.id)}
                                                                        title="Xóa"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {step === "saving" && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-indigo-900 font-bold">Đang cập nhật Cơ sở dữ liệu khối/trường...</p>
                    </div>
                )}
            </div>

            <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0 flex items-center justify-between">
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-md hover:bg-gray-100 font-bold text-gray-500 transition-colors" disabled={step === "saving"}>
                    {step === 'processing' ? 'Hủy' : 'Đóng'}
                </button>

                {step === "review" && (
                    <button
                        onClick={handleSave}
                        disabled={totalWarnings > 0}
                        className={`px-6 py-2 rounded-lg font-black uppercase tracking-wide shadow-[0_4px_0_rgb(0,0,0,0.1)] transition-all ${totalWarnings > 0 ? 'bg-gray-300 pointer-events-none text-gray-500 border-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_0_rgb(67,56,202)] active:shadow-none active:translate-y-1'}`}
                    >
                        Đồng ý & Lưu (Tương đương Điểm danh tay)
                    </button>
                )}
            </div>
        </DialogContent>
    </Dialog>
);
}
