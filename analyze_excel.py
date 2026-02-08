import pandas as pd
import os
import sys

# Set encoding to utf-8 for output
sys.stdout.reconfigure(encoding='utf-8')

file_path = r'c:\AI APP\app-diemdanh\In So Diem Ca Nhan_T9_2025-2026.xlsx'

print(f"--- BẮT ĐẦU PHÂN TÍCH FILE: {os.path.basename(file_path)} ---")

if not os.path.exists(file_path):
    print(f"❌ Lỗi: Không tìm thấy file tại {file_path}")
    sys.exit(1)

try:
    # Load Excel File
    xl = pd.ExcelFile(file_path)
    print(f"📂 Các Sheet tìm thấy: {xl.sheet_names}")

    # 1. Analyze Sheet 'Thong ke'
    if 'Thong ke' in xl.sheet_names:
        print("\n📊 --- Phân tích Sheet: 'Thong ke' ---")
        # Read raw to see layout
        df_tk = pd.read_excel(xl, 'Thong ke', header=None)
        print(f"   ► Tổng số dòng raw: {len(df_tk)}")
        print("   ► 5 dòng đầu tiên:")
        print(df_tk.head(5).to_string())
    else:
        print("\n⚠️ Không thấy sheet 'Thong ke'")

    # 2. Analyze Sheet 'CSDL'
    if 'CSDL' in xl.sheet_names:
        print("\n👨‍🎓 --- Phân tích Sheet: 'CSDL' ---")
        
        # Check Header at Row 1 (Index 0)
        df_raw = pd.read_excel(xl, 'CSDL', header=None, nrows=5)
        print("   ► 5 dòng đầu tiên (Raw Check Headers):")
        print(df_raw.to_string())

        # Assuming Header is at Row 2 (Index 1) based on previous assumptions
        print("\n   ► Thử đọc với Header ở dòng 2 (Index 1):")
        df_csdl = pd.read_excel(xl, 'CSDL', header=1)
        print(f"   ► Các cột nhận diện được: {list(df_csdl.columns)}")
        print(f"   ► Tổng số dòng dữ liệu: {len(df_csdl)}")
        
        # Check specific columns critical for logic
        required_cols = ['Mã lớp', 'STT', 'Họ tên', 'Ngày sinh']
        missing = [c for c in required_cols if c not in df_csdl.columns]
        if missing:
            print(f"   ❌ CẢNH BÁO: Thiếu các cột quan trọng: {missing}")
            print("   (Có thể header nằm ở dòng khác hoặc tên cột bị sai chính tả/dấu câu)")
        else:
            print("   ✅ Đủ các cột quan trọng.")

    else:
        print("\n❌ Lỗi nghiêm trọng: Không thấy sheet 'CSDL' (Chứa danh sách học sinh)")

except Exception as e:
    print(f"\n❌ Lỗi khi đọc file Excel: {e}")
    # Hint if missing lib
    import importlib.util
    if importlib.util.find_spec("openpyxl") is None:
        print("💡 Gợi ý: Có thể thiếu thư viện 'openpyxl'. Hãy chạy: pip install openpyxl")

print("\n--- HOÀN TẤT ---")
