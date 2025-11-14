const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Небольшой помощник, чтобы подождать
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!REPLICATE_API_TOKEN) {
    return res
      .status(500)
      .json({ ok: false, error: "Missing REPLICATE_API_TOKEN" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const prompt = (body && body.prompt ? String(body.prompt) : "").trim();
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "empty_prompt" });
    }

    // Создаём prediction в Replicate (используем быстрый flux-schnell)
    const createResp = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt,
          },
        }),
      }
    );

    const createData = await createResp.json().catch(() => null);

    if (!createResp.ok || !createData || !createData.id) {
      console.error("Replicate create error:", createData);
      return res.status(502).json({
        ok: false,
        error: "replicate_create_failed",
        detail: createData || null,
      });
    }

    let prediction = createData;

    // Ждём, пока статус станет succeeded / failed
    for (let i = 0; i < 30; i++) {
      if (prediction.status === "succeeded") break;
      if (
        prediction.status === "failed" ||
        prediction.status === "canceled"
      ) {
        break;
      }

      await sleep(2000);

      const pollResp = await fetch(prediction.urls.get, {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
        },
      });

      const pollData = await pollResp.json().catch(() => null);
      if (pollData && pollData.status) {
        prediction = pollData;
      } else {
        break;
      }
    }

    if (prediction.status !== "succeeded") {
      console.error("Replicate final status:", prediction);
      return res.status(502).json({
        ok: false,
        error: "replicate_not_succeeded",
        status: prediction.status,
      });
    }

    const output = prediction.output;
    let imageUrl =
      Array.isArray(output) && output.length > 0 ? output[0] : null;

    if (!imageUrl) {
      return res
        .status(502)
        .json({ ok: false, error: "no_image_in_output" });
    }

    // Возвращаем URL картинки фронту
    return res.status(200).json({
      ok: true,
      imageUrl,
      model: "black-forest-labs/flux-schnell",
    });
  } catch (e) {
    console.error("Server error:", e);
    return res.status(500).json({
      ok: false,
      error: "server_error",
      message: String(e && e.message ? e.message : e),
    });
  }
}