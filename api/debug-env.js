export default function handler(req, res) {
  res.status(200).json({
    REPLICATE_API_TOKEN_EXISTS: !!process.env.REPLICATE_API_TOKEN,
    ALL_KEYS: Object.keys(process.env),
  });
}
