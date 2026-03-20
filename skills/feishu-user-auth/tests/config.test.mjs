import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";

import {
  getRuntimeConfig,
  installRuntimeConfig,
  loadSkillConfig,
  resetRuntimeConfig,
} from "../scripts/src/config.js";
import { listStoredTokens, setStoredToken } from "../scripts/src/token-store.js";

test("loadSkillConfig reads config from skill file instead of FEISHU_* env", async () => {
  const skillDir = await mkdtemp(join(tmpdir(), "feishu-skill-"));
  const storeDir = join(skillDir, "custom-store");

  process.env.FEISHU_APP_ID = "env_app";
  process.env.FEISHU_APP_SECRET = "env_secret";
  process.env.FEISHU_BRAND = "lark";

  try {
    await writeFile(
      join(skillDir, "config.json"),
      JSON.stringify(
        {
          appId: "file_app",
          appSecret: "file_secret",
          brand: "feishu",
          storeDir,
        },
        null,
        2,
      ),
      "utf8",
    );

    const config = await loadSkillConfig({ skillDir });
    assert.equal(config.appId, "file_app");
    assert.equal(config.appSecret, "file_secret");
    assert.equal(config.brand, "feishu");
    assert.equal(config.storeDir, storeDir);
  } finally {
    delete process.env.FEISHU_APP_ID;
    delete process.env.FEISHU_APP_SECRET;
    delete process.env.FEISHU_BRAND;
    await rm(skillDir, { recursive: true, force: true });
  }
});

test("loadSkillConfig supports snake_case config format", async () => {
  const skillDir = await mkdtemp(join(tmpdir(), "feishu-skill-"));

  try {
    await writeFile(
      join(skillDir, "config.json"),
      JSON.stringify(
        {
          app_id: "snake_app",
          app_secret: "snake_secret",
          is_lark: true,
        },
        null,
        2,
      ),
      "utf8",
    );

    const config = await loadSkillConfig({ skillDir });
    assert.equal(config.appId, "snake_app");
    assert.equal(config.appSecret, "snake_secret");
    assert.equal(config.brand, "lark");
  } finally {
    await rm(skillDir, { recursive: true, force: true });
  }
});

test("loadSkillConfig expands ~/ paths for storeDir and legacyStoreDir", async () => {
  const skillDir = await mkdtemp(join(tmpdir(), "feishu-skill-"));

  try {
    await writeFile(
      join(skillDir, "config.json"),
      JSON.stringify(
        {
          appId: "file_app",
          appSecret: "file_secret",
          storeDir: "~/.feishu-auth",
          legacyStoreDir: "~/legacy-feishu-auth",
        },
        null,
        2,
      ),
      "utf8",
    );

    const config = await loadSkillConfig({ skillDir });
    assert.equal(config.storeDir, join(homedir(), ".feishu-auth"));
    assert.equal(config.legacyStoreDir, join(homedir(), "legacy-feishu-auth"));
  } finally {
    await rm(skillDir, { recursive: true, force: true });
  }
});

test("installRuntimeConfig makes token-store paths available without process.env defaults", async () => {
  const skillDir = await mkdtemp(join(tmpdir(), "feishu-skill-"));
  const storeDir = join(skillDir, "state-a");
  const legacyStoreDir = join(skillDir, "state-b");

  try {
    await writeFile(
      join(skillDir, "config.json"),
      JSON.stringify(
        {
          appId: "file_app",
          appSecret: "file_secret",
          storeDir,
          legacyStoreDir,
        },
        null,
        2,
      ),
      "utf8",
    );

    resetRuntimeConfig();
    installRuntimeConfig(await loadSkillConfig({ skillDir }));

    const config = getRuntimeConfig();
    assert.equal(config.storeDir, storeDir);
    assert.equal(config.legacyStoreDir, legacyStoreDir);

    await setStoredToken({
      userOpenId: "ou_skill",
      appId: "file_app",
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() + 120_000,
      scope: "offline_access",
      grantedAt: Date.now(),
    });

    const tokens = await listStoredTokens("file_app");
    assert.equal(tokens.length, 1);
  } finally {
    resetRuntimeConfig();
    await rm(skillDir, { recursive: true, force: true });
  }
});
