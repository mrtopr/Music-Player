
async function debugApi() {
    try {
        const res = await fetch('http://localhost:3000/api/modules?language=hindi,english');
        const data = await res.json();
        console.log('API Response Schema:', Object.keys(data.data));
        console.log('Albums length:', data.data.albums?.length);
        console.log('Playlists length:', data.data.playlists?.length);
        console.log('Trending songs length:', data.data.trending?.songs?.length);
        console.log('Trending albums length:', data.data.trending?.albums?.length);
        console.log('First trending song:', data.data.trending?.songs?.[0]?.name);
        console.log('First trending album:', data.data.trending?.albums?.[0]?.name);
    } catch (e) {
        console.error('Debug failed:', e);
    }
}
debugApi();
