const { initializeFirebaseApp, backup } = require('firestore-export-import');
const fs = require('fs');

const serviceAccount = require('./service-account.json');
// Thử thêm databaseURL nếu cần thiết
const databaseURL = `https://${serviceAccount.project_id}.firebaseio.com`;

const exportData = async () => {
    try {
        console.log('Đang kết nối Firebase: ' + serviceAccount.project_id);
        
        // Khởi tạo (Thử truyền thêm tham số databaseURL)
        await initializeFirebaseApp(serviceAccount, databaseURL);

        console.log('Đang xuất dữ liệu (Backup)... Vui lòng đợi...');
        
        // Xuất toàn bộ dữ liệu
        const data = await backup(); 

        if (!data || Object.keys(data).length === 0) {
            console.warn('Cảnh báo: Không có dữ liệu nào được tìm thấy hoặc backup() trả về rỗng.');
        }

        // Lưu dữ liệu ra file JSON
        fs.writeFileSync('my_database_backup.json', JSON.stringify(data, null, 2));
        console.log('Xuất dữ liệu thành công ra file my_database_backup.json!');
        console.log('Tổng số collections: ' + Object.keys(data || {}).length);

    } catch (error) {
        console.error('Đã xảy ra lỗi khi export:', error);
    }
};

exportData();
