export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  res.status(200).json({
    REPLICATE_API_TOKEN_EXISTS: !!process.env.REPLICATE_API_TOKEN,
    STABILITY_API_KEY_EXISTS: !!process.env.STABILITY_API_KEY,
    ACCESS_TOKEN_EXISTS: !!process.env.ACCESS_TOKEN,
    ALLOWED_ORIGINS_EXISTS: !!process.env.ALLOWED_ORIGINS,
    ALL_KEYS: Object.keys(process.env).filter(k =>
      ["REPLICATE", "STABILITY", "ACCESS", "ALLOWED"].some(word =>
        k.includes(word)
      )
    )
  });
}
