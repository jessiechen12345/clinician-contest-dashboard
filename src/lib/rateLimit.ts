import { incrWithTtl } from "./storage";

export async function rateLimited(ip: string, bucket: string, limit: number, windowSec = 600): Promise<boolean> {
  const n = await incrWithTtl(`rl:${bucket}:${ip}`, windowSec);
  return n > limit;
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return (xf?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}
