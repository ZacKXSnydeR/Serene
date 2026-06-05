import fs from 'fs';

async function run() {
  const body = {
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20240918.01.00"
      }
    },
    browseId: "UCQQO0A_lO1_j-d9sK6G6uHA" // Billie Eilish
  };
  const res = await fetch("https://music.youtube.com/youtubei/v1/browse", {
    method: "POST",
    body: JSON.stringify(body)
  });
  const json = await res.json();
  fs.writeFileSync("artist_dump.json", JSON.stringify(json, null, 2));
  console.log("Dumped to artist_dump.json");
}
run();
