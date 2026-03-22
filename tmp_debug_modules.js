
const fetch = require('node-fetch'); // or use built-in fetch if possible
async function debugModules() {
    try {
        const res = await fetch('https://www.jiosaavn.com/api.php?__call=content.getBrowseModules&_format=json&language=hindi,english');
        const data = await res.json();
        console.log('Keys in modules:', Object.keys(data));
        if (data.top_artists) {
            console.log('Top Artists length:', data.top_artists.length);
            console.log('First artist:', data.top_artists[0]);
        }
    } catch (e) {
        console.error('Debug failed:', e);
    }
}
debugModules();
