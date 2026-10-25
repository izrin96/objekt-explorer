import { MESSAGE_WINDOW_MS, messageRateDecision } from "../../lib/chat-rules";
import { redis, redisFailOpen } from "../redis";
import { refuse } from "./refuse";

const MESSAGE_WINDOW_SCRIPT = `
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", ARGV[1] - ARGV[2])
local prior = redis.call("ZRANGE", KEYS[1], 0, -1)
redis.call("ZADD", KEYS[1], ARGV[1], ARGV[3])
redis.call("PEXPIRE", KEYS[1], ARGV[2])
return prior
`;

const sendTime = (member: string) => Number(member.split(":")[0]);

/**
 * Reads the earlier sends and adds this one in one script, so parallel sends each see the
 * others; a refused send is taken back out and never counts. Returns the release for a send
 * refused later on.
 */
export async function checkMessageRate(userId: string, now: Date): Promise<() => Promise<void>> {
  const key = `chat:msgs:${userId}`;
  const member = `${now.getTime()}:${crypto.randomUUID()}`;
  // fails open, as every rate limit does: a Redis outage must not stop chat
  const prior = (await redisFailOpen("chat rate", () =>
    redis.send("EVAL", [
      MESSAGE_WINDOW_SCRIPT,
      "1",
      key,
      String(now.getTime()),
      String(MESSAGE_WINDOW_MS),
      member,
    ]),
  )) as string[] | null;

  const release = async () => {
    await redisFailOpen("chat rate", () => redis.send("ZREM", [key, member]));
  };
  if (prior === null) return release;
  const decision = messageRateDecision(prior.map(sendTime), now);
  if (!decision.ok) {
    await release();
    refuse("message_limit", decision.retryAt);
  }
  return release;
}
