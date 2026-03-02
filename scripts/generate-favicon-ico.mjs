import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pngToIco from "png-to-ico";

const inputPngs = [
  resolve("public/favicon-16x16.png"),
  resolve("public/favicon-32x32.png"),
];

const outputPath = resolve("app/favicon.ico");

const ico = await pngToIco(inputPngs);
await writeFile(outputPath, ico);

console.log(`Generated ${outputPath} from ${inputPngs.length} PNGs`);
