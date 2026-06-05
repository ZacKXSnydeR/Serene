const { execSync } = require('child_process');

async function testWiki() {
    const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/Kendrick%20Lamar');
    const json = await res.json();
    
    const desc = (json.description || "").toLowerCase();
    const isMusic = desc.includes('musician') || desc.includes('singer') || desc.includes('rapper') || desc.includes('band') || desc.includes('producer') || desc.includes('songwriter');
    
    console.log("type:", json.type);
    console.log("desc:", desc);
    console.log("isMusic:", isMusic);
    console.log("extract:", json.extract ? json.extract.substring(0, 100) : null);
}

testWiki();
