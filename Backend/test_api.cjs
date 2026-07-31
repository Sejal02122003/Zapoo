const http = require('http');

http.get('http://localhost:5000/api/v1/food/hero-banners/ads/public', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log("Response:", JSON.stringify(JSON.parse(data), null, 2));
    });
}).on('error', (err) => {
    console.error("Error:", err);
});
