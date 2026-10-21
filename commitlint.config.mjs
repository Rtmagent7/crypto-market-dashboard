const config = {
  extends: ["@commitlint/config-conventional"],
  // Dependabot writes "chore(deps): Bump x from a to b"; its subject case is not ours to fix.
  ignores: [(message) => message.includes("Signed-off-by: dependabot[bot]")],
};

export default config;
