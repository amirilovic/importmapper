import { $ } from "zx";

export async function getLatestPkgVersion(pkg: string) {
  const { stdout } = await $`npm show ${pkg} version`;
  return stdout.trim();
}
