import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://survey-cli.crafter.run",
  output: "static",
  integrations: [tailwind()],
});
