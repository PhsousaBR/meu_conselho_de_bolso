
/**
 * Strict BRL Parser
 * Handles:
 * - "1.200,50" -> 1200.50
 * - "R$ 1.200,50" -> 1200.50
 * - "1200,50" -> 1200.50
 * - 1200.50 (number) -> 1200.50
 * 
 * Rules:
 * - If input is number, return it.
 * - Remove "R$", whitespace, &nbsp;.
 * - If "," and "." exist: assume dot is thousand, comma is decimal -> remove dot, replace comma with dot.
 * - If only "," exists: replace with dot.
 * - If only "." exists:
 *    - If multiple dots (1.000.000) -> remove all.
 *    - If starts with 0. (0.50) -> keep.
 *    - Heuristic: If it looks like US format (1200.50), keep.
 */
export const parseMoneyBR = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;

    let clean = val.toString().replace(/R\$|\s|&nbsp;/g, '').trim();

    if (!clean) return 0;

    // Case: Mixed separators "1.234,56"
    if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    }
    // Case: Only comma "1234,56"
    else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    // Case: Only dot "1.234" or "1234.56"
    else if (clean.includes('.')) {
        // This is the tricky part. 
        // 1.234 could be 1,234 (one thousand) or 1.234 (one point two)
        // Given Context (BR CSV): likely thousand separator if 3 decimals at end?
        // But "valor" column usually comes as US float from exports.
        // We will assume US float if it parses cleanly, UNLESS it has multiple dots.

        const countDots = (clean.match(/\./g) || []).length;
        if (countDots > 1) {
            // "1.200.000" -> remove dots
            clean = clean.replace(/\./g, '');
        } else {
            // "1234.56" -> keep
            // "1.234" -> Keep as 1.234 (US float) usually safer for single dot unless we know it's strict BR int
            // For this specific task, user said: "ImportData: value_br" is the reliable source usually.
        }
    }

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

export const formatBRL2 = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

export const formatAxisCompact = (value: number): string => {
    if (Math.abs(value) >= 1000) {
        const kVal = value / 1000;
        return `R$${kVal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}k`;
    }
    return formatBRL2(value);
};
