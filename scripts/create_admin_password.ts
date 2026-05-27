import { getKv } from "../server/kv.ts";
import { ADMIN_PASSWORD_KEY, createPasswordHash } from "../server/password.ts";
import { config } from "../server/config.ts";

const MIN_PASSWORD_LENGTH = 12;

async function readFromStdin(): Promise<[string, string]> {
  const input = await new Response(Deno.stdin.readable).text();
  const [password = "", confirmation = ""] = input.split(/\r?\n/);
  return [password, confirmation];
}

function requirePrompt(label: string): string {
  const value = prompt(label);
  if (value === null) {
    console.error("Cancelled.");
    Deno.exit(1);
  }

  return value;
}

const [password, confirmation] = Deno.args.includes("--stdin")
  ? await readFromStdin()
  : [
    requirePrompt("New admin password: "),
    requirePrompt("Confirm admin password: "),
  ];

if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  Deno.exit(1);
}

if (password !== confirmation) {
  console.error("Passwords do not match.");
  Deno.exit(1);
}

const kv = await getKv();
const record = await createPasswordHash(password);
await kv.set(ADMIN_PASSWORD_KEY, record);
kv.close();

console.log(`Admin password stored in KV at ${config.kvPath}.`);
