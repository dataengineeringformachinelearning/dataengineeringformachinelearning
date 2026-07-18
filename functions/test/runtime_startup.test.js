const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { test } = require("node:test");

test("loads in the Cloud Run runtime without Redpanda configuration", () => {
  const result = spawnSync(
    process.execPath,
    ["-e", 'require("./lib/index.js")'],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        GCLOUD_PROJECT: "demldotcom",
        K_SERVICE: "ingestevent",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
});
