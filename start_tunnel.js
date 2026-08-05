import localtunnel from "localtunnel";
import fs from "fs";

(async () => {
  const tunnel = await localtunnel({ port: 4173 });
  const url = tunnel.url;
  fs.writeFileSync("C:\\Users\\DT User2\\claudecode\\cinematic penthouse\\tunnel_url.txt", url);
  console.log("Tunnel URL: " + url);
  tunnel.on("close", () => {
    console.log("Tunnel closed");
  });
})();
