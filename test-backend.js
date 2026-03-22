
import axios from 'axios';

const testArtists = async () => {
    const artists = ['1126742', '459320', '568541']; // Badshah, Pritam, Arijit
    for (const id of artists) {
        try {
            console.log(`Testing artist ID: ${id}`);
            const res = await axios.get(`http://localhost:3000/api/artists?id=${id}`);
            console.log(`Status for ${id}: ${res.status}`);
            console.log(`Name: ${res.data.name}`);
        } catch (err) {
            console.error(`Error for ${id}: ${err.message}`);
        }
    }
};

testArtists();
