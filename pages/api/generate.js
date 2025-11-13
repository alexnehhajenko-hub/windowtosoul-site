export const config = {
  api: { bodyParser: false },
};

import formidable from "formidable";

const STABILITY_URL =
  "https://api.stability.ai/v2beta/stable-image/generate/core";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ ok: false, error: "missing_STABILITY_API_KEY" });
  }

  try {
    const form = formidable({});
    const [fields] = await form.parse(req);
    const prompt = fields.prompt || "portrait photo, soft daylight, 4k";

    const fd = new FormData();
    fd.append("prompt", prompt);
    fd.append("output_format", "png");
    fd.append("style_preset", "photographic");

    const r = await fetch(STABILITY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: fd,
    });

    const text = await r.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        status: r.status,
        error: "stability_error",
        body: text,
      });
    }

    const img =
      data?.image ||
      data?.base64 ||
      (data?.artifacts?.[0]?.base64 || null);

    if (!img) {
      return res.status(500).json({ ok: false, error: "no_image_returned" });
    }

    res.status(200).json({
      ok: true,
      imageBase64: img,
      model: "stable-image-core-v2beta",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      message: e.message || String(e),
    });
  }
}
