export const parseQueryLimit = (raw, fallback = 100, max = 1000) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
};

export const parseQueryPage = (raw, fallback = 1) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return parsed;
};

export const buildPaginationOptions = (query) => {
    const page = parseQueryPage(query.page, 1);
    const limit = parseQueryLimit(query.limit, 20, 100);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

export const buildPaginatedResult = ({ docs, total, page, limit }) => {
    const totalPages = Math.ceil(total / limit) || 1;

    return {
        data: docs,
        meta: {
            total,
            page,
            limit,
            totalPages
        }
    };
};
export const cleanImageUrl = (imageUrl) => {
    if (typeof imageUrl !== 'string') return '';
    let trimmed = imageUrl.trim();
    if (!trimmed || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return trimmed;

    // 1. Unwrap Google Images Search / Redirect URLs
    if (/google\.[a-z.]+\/imgres/i.test(trimmed) || /google\.[a-z.]+\/url/i.test(trimmed)) {
        try {
            const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            const directUrl = u.searchParams.get('imgurl') || u.searchParams.get('url') || u.searchParams.get('q');
            if (directUrl && /^https?:\/\//i.test(directUrl)) {
                trimmed = decodeURIComponent(directUrl);
            }
        } catch {}
    }

    // 2. Google Drive share links -> direct view URL
    if (/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i.test(trimmed)) {
        const match = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }

    // 3. Dropbox links -> raw=1
    if (/dropbox\.com\//i.test(trimmed) && trimmed.includes('dl=0')) {
        trimmed = trimmed.replace('dl=0', 'raw=1');
    }

    return trimmed
        .replace(/\\/g, '/')
        .replace(/^(https?):\/(?!\/)/i, '$1://')
        .replace(/^(https?:\/\/)(https?:\/\/)/i, '$1');
};
