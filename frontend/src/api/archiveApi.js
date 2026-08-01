/**
 * Archive.org Public Domain Movies API Service
 */

const ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php';
const ARCHIVE_METADATA_URL = 'https://archive.org/metadata';

export const MOVIE_CATEGORIES = [
    { id: 'all', name: 'All Movies', query: 'collection:feature_films' },
    { id: 'classic', name: 'Classic Films', query: 'collection:classic_tv_shows OR collection:feature_films' },
    { id: 'silent', name: 'Silent Era', query: 'subject:"silent film" OR subject:"silent movie"' },
    { id: 'scifi', name: 'Sci-Fi & Horror', query: 'subject:"sci-fi" OR subject:"horror"' },
    { id: 'comedy', name: 'Comedy', query: 'subject:"comedy"' },
    { id: 'animation', name: 'Animation', query: 'collection:animationandcartoons' }
];

/**
 * Search public domain movies on Archive.org
 */
export async function searchArchiveMovies(searchQuery = '', categoryId = 'all', page = 1, rows = 24) {
    try {
        const categoryObj = MOVIE_CATEGORIES.find(c => c.id === categoryId) || MOVIE_CATEGORIES[0];
        
        let q = `mediatype:movies AND (${categoryObj.query})`;
        if (searchQuery.trim()) {
            q += ` AND (title:(${searchQuery}) OR description:(${searchQuery}))`;
        }

        const params = new URLSearchParams({
            q: q,
            'fl[]': 'identifier,title,description,year,downloads,collection,publicdate,creator',
            'sort[]': 'downloads desc',
            rows: rows.toString(),
            page: page.toString(),
            output: 'json'
        });

        const response = await fetch(`${ARCHIVE_SEARCH_URL}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Archive API HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            docs: data.response?.docs || [],
            numFound: data.response?.numFound || 0,
            page: page
        };
    } catch (error) {
        console.error('Failed to search Archive movies:', error);
        return { docs: [], numFound: 0, page: 1, error: error.message };
    }
}

/**
 * Fetch detailed metadata and video/download files for a movie item
 */
export async function getArchiveMovieMetadata(identifier) {
    try {
        const response = await fetch(`${ARCHIVE_METADATA_URL}/${identifier}`);
        if (!response.ok) {
            throw new Error(`Archive Metadata HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const files = data.files || [];

        // Filter video & download formats
        const videoFiles = files.filter(f => {
            const format = (f.format || '').toLowerCase();
            const name = (f.name || '').toLowerCase();
            return (
                name.endsWith('.mp4') ||
                name.endsWith('.ogv') ||
                name.endsWith('.webm') ||
                format.includes('mpeg4') ||
                format.includes('h.264') ||
                format.includes('512kb')
            );
        }).map(f => {
            const directUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`;
            return {
                name: f.name,
                format: f.format || 'MP4 Video',
                size: f.size ? formatBytes(parseInt(f.size, 10)) : 'Unknown size',
                rawSize: parseInt(f.size, 10) || 0,
                height: f.height || null,
                width: f.width || null,
                bitrate: f.bitrate || null,
                url: directUrl
            };
        });

        // Sort by raw file size (higher quality first)
        videoFiles.sort((a, b) => b.rawSize - a.rawSize);

        // Check for torrent file
        const torrentFile = files.find(f => f.name && f.name.endsWith('_archive.torrent'));
        const torrentUrl = torrentFile ? `https://archive.org/download/${identifier}/${encodeURIComponent(torrentFile.name)}` : null;

        return {
            metadata: data.metadata || {},
            videoFiles: videoFiles,
            torrentUrl: torrentUrl,
            thumbnailUrl: `https://archive.org/services/img/${identifier}`,
            detailsUrl: `https://archive.org/details/${identifier}`
        };
    } catch (error) {
        console.error(`Failed to fetch metadata for ${identifier}:`, error);
        return null;
    }
}

function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
