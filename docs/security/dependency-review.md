# Dependency security review

Review date: 2026-08-26. Command: `npm audit --json` at the monorepo root.

## Outcome

The first audit reported 49 findings: 20 high, 10 moderate, 19 low, and no critical findings. Prisma and `@prisma/client` were safely pinned to 6.12.0, removing three high findings without changing the application API. The resulting review contained 46 findings: 17 high, 10 moderate, 19 low, and no critical findings.

The remaining high findings are development-only Hardhat/toolbox dependency paths: `@nomicfoundation/hardhat-chai-matchers`, `@nomicfoundation/hardhat-ethers`, `@nomicfoundation/hardhat-ignition`, `@nomicfoundation/hardhat-ignition-ethers`, `@nomicfoundation/hardhat-network-helpers`, `@nomicfoundation/hardhat-toolbox`, `@nomicfoundation/hardhat-verify`, `@typechain/hardhat`, `adm-zip`, `hardhat`, `hardhat-gas-reporter`, `lodash`, `serialize-javascript`, `solidity-coverage`, `tmp`, `undici`, and `ws`.

`npm audit fix --force` proposes Hardhat 3/toolbox 7, a breaking toolchain migration. It was intentionally not applied during final hardening. These packages are not installed in production containers, do not process application requests, and are used only for local contract compilation/testing. CI and local use should treat untrusted Solidity projects, archives, network endpoints, and test inputs as unsafe. The next planned maintenance task is an isolated Hardhat 3 migration with contract regression tests.

The registry endpoint was temporarily unavailable during the final repeat attempt. The counts above are from the successful post-fix audit in this session; rerun `npm audit --json` before deployment.

## Policy

- No critical production vulnerability is accepted.
- Do not use `npm audit fix --force` without a dedicated migration and regression run.
- Production images install only the relevant workspace dependencies and never run Hardhat.
- Re-run the audit before every demonstration release and record changed findings here.
