import fs from 'fs';

async function run() {
  const q = process.argv[2] || "Mir Afsar Ali";
  const body = {
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20240918.01.00"
      }
    },
    query: q
  };
  const res = await fetch("https://music.youtube.com/youtubei/v1/search", {
    method: "POST",
    body: JSON.stringify(body)
  });
  const json = await res.json();
  fs.writeFileSync("search_dump.json", JSON.stringify(json, null, 2));
  console.log("Dumped to search_dump.json");
}
run();
