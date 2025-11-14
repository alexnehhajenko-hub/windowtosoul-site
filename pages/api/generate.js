export const config = {
  api: {
    bodyParser: false,
  },
};

import { IncomingForm } from "formidable";
import fs from "fs";
import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parse error", details: err });
    }

    try {
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });

      const prompt = fields.prompt || "a beautiful oil painting portrait";
      const style = fields.style || "oil painting";

      let imageFile = null;
      if (files.image) {
        imageFile = fs.readFileSync(files.image.filepath);
      }

      const input = {
        prompt: `${style}, ${prompt}`,
      };

      if (imageFile) {
        input.image = imageFile;
      }

      const output = await replicate.run(
        "black-forest-labs/flux-1:1cfafb0e0faae7cabd1a7595f3237963",
        { input }
      );

      return res.status(200).json({ output });
    } catch (e) {
      return res.status(500).json({ error: "Generation failed", details: e });
    }
  });
}