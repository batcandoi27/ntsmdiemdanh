/**
 * Archive Checker - Logic for auto-archiving columns
 */

import { Column } from '@/types/models';
import { getOneTimeRecords, checkOneTimeComplete } from '@/services/record-service';
import { archiveColumn, getColumns } from '@/services/column-service';

/**
 * Check if a period column has expired
 */
export function isPeriodExpired(column: Column): boolean {
    if (column.frequency !== 'period' || !column.periodConfig) {
        return false;
    }

    const today = new Date().toISOString().split('T')[0];
    return today > column.periodConfig.endDate;
}

/**
 * Check if a one-time column is complete for all students
 */
export async function isOneTimeComplete(columnId: string, totalStudents: number): Promise<boolean> {
    return checkOneTimeComplete(columnId, totalStudents);
}

/**
 * Run auto-archive check for a class
 * Returns the number of columns archived
 */
export async function runAutoArchiveCheck(classId: string, studentCounts: Record<string, number>): Promise<number> {
    const columns = await getColumns(classId);
    let archivedCount = 0;

    for (const column of columns) {
        // Skip already archived columns
        if (column.archived) continue;

        // Check period columns
        if (column.frequency === 'period' && isPeriodExpired(column)) {
            await archiveColumn(column.id);
            archivedCount++;
            console.log(`Auto-archived period column: ${column.name}`);
            continue;
        }

        // Check one-time columns
        if (column.frequency === 'one_time') {
            const totalStudents = studentCounts[column.classId] || 0;
            if (totalStudents > 0) {
                const isComplete = await isOneTimeComplete(column.id, totalStudents);
                if (isComplete) {
                    await archiveColumn(column.id);
                    archivedCount++;
                    console.log(`Auto-archived one-time column: ${column.name}`);
                }
            }
        }
    }

    return archivedCount;
}

/**
 * Get columns that need attention (about to expire or nearly complete)
 */
export function getColumnsNeedingAttention(columns: Column[]): {
    expiringSoon: Column[];
    almostComplete: Column[];
} {
    const today = new Date();
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    const oneWeekStr = oneWeekLater.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const expiringSoon = columns.filter(c => {
        if (c.archived || c.frequency !== 'period' || !c.periodConfig) return false;
        return c.periodConfig.endDate <= oneWeekStr && c.periodConfig.endDate >= todayStr;
    });

    // Note: almostComplete would require async calls, so we return empty for now
    // In real usage, this would be computed separately
    return {
        expiringSoon,
        almostComplete: [],
    };
}

/**
 * Format period key from date and type
 */
export function generatePeriodKey(date: Date, type: 'month' | 'semester' | 'custom'): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    switch (type) {
        case 'month':
            return `${year}-${month.toString().padStart(2, '0')}`;
        case 'semester':
            const semester = month <= 6 ? 'HK2' : 'HK1';
            const schoolYear = month <= 6 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
            return `${schoolYear}-${semester}`;
        case 'custom':
        default:
            return `${year}-${month.toString().padStart(2, '0')}`;
    }
}
