# Meridian — Decentralized VPN on Stellar

**[Repo](https://github.com/shakshi-06/Meridian)** | **[Live Demo](https://meridian.vercel.app)** | **[Demo Video](#)** | **[Stellar Explorer](https://stellar.expert/explorer/testnet)**

[![CI](https://github.com/shakshi-06/Meridian/actions/workflows/ci.yml/badge.svg)](https://github.com/shakshi-06/Meridian/actions/workflows/ci.yml)
![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Tests](https://img.shields.io/badge/Tests-20%2B%20passing-brightgreen)

---

## The Problem

Commercial VPNs ask you to trust a single company with everything a VPN is supposed to hide: your traffic, your IP, and often your payment details. That company can log you, throttle you, get subpoenaed, or simply shut down — and you have no way to verify any of it. There's also no way for someone who *runs* a VPN server to get paid for it without signing up as an employee of that same company.

## The Solution

Meridian moves the trust layer onto Stellar. Independent operators stake XLM collateral and list exit nodes on-chain through `NodeRegistry`. Users rent a node by the hour through `SessionManager`, which escrows payment and releases it only once the session ends — at which point the user's rating writes back into the node's public reputation. No company sits in the middle holding funds, logs, or a kill switch. The two contracts coordinate the whole lifecycle by calling each other directly.

---

## Screenshots

### Mobile Responsive UI

`docs/screenshots/mobile-marketplace.png` · `docs/screenshots/mobile-session.png` · `docs/screenshots/mobile-provider.png`

### Desktop UI

`docs/screenshots/desktop-hero.png`

### Wallet Connected State

`docs/screenshots/wallet-connected.png`

### Rent Flow

`docs/screenshots/rent-flow.png`

### CI/CD Pipeline Running

`docs/screenshots/ci-pipeline.png`

### Test Output

`docs/screenshots/test-output.png`

> Screenshots are captured after deployment — see `DEPLOYMENT.md` for the exact steps, then drop the images into `docs/screenshots/` and this section will render them.

---

## Contract Information

**Network:** Stellar Testnet

| Field                        | Value             |
| ---------------------------- | ------------------ |
| NodeRegistry Contract        | `FILL_IN_AFTER_DEPLOY` |
| SessionManager Contract      | `FILL_IN_AFTER_DEPLOY` |
| Deployer Address             | `FILL_IN_AFTER_DEPLOY` |
| Transaction Hash (interaction) | `FILL_IN_AFTER_DEPLOY` |

Verify on Stellar Explorer once filled in:

- `https://stellar.expert/explorer/testnet/contract/<NODE_REGISTRY_ID>`
- `https://stellar.expert/explorer/testnet/contract/<SESSION_MANAGER_ID>`
- `https://stellar.expert/explorer/testnet/tx/<TX_HASH>`

---

## Features

- Freighter wallet connect and disconnect, testnet network check
- Node marketplace: filter by region, sort by price or rating, live stake/reputation stats
- Pay-per-session rental with on-chain XLM escrow and release
- Provider dashboard: register a node, lock stake, deactivate/reactivate, withdraw stake, track earnings
- Session dashboard: live countdown on active sessions, rate-and-end flow, spend history
- Live activity feed polling Soroban RPC `getEvents` every 12 seconds
- Two Soroban smart contracts with inter-contract communication (`SessionManager` → `NodeRegistry`)
- Endpoint privacy: node addresses are hashed client-side before ever touching the chain
- Mobile responsive layout down to 360px
- CI/CD pipeline via GitHub Actions (contract tests + wasm build + frontend lint/test/build)
- 20+ passing tests across contracts and frontend

---

## Tech Stack

| Layer           | Technology                                    |
| ---------------- | --------------------------------------------- |
| Frontend         | React 18 + Vite                               |
| Styling          | Pure CSS with custom properties (duotone palette) |
| Wallet           | Freighter (`@stellar/freighter-api`)          |
| Blockchain       | Stellar Testnet                               |
| Smart Contracts  | Soroban (Rust) — NodeRegistry + SessionManager |
| SDK              | `@stellar/stellar-sdk`                        |
| Testing          | Vitest + Testing Library (frontend), `cargo test` (contracts) |
| CI/CD            | GitHub Actions                                |
| Deployment       | Vercel                                        |

---

## Smart Contracts

Two contracts demonstrating inter-contract communication:

**NodeRegistry** — providers stake XLM and list an exit node (region, price/hour, hashed endpoint). Holds each node's stake, active flag, reputation total, and lifetime earnings. Reputation and earnings can only be written by the address set as `SessionManager` at deploy time.

**SessionManager** — users rent a node by the hour. Reads live price and active status straight from `NodeRegistry`, escrows payment for the duration, and on session end releases payment to the provider while calling back into `NodeRegistry` to submit the rating and record the earning.

### Contract Functions

| Contract       | Function                                                      | Description                                    |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| NodeRegistry   | `initialize(admin, token)`                                     | Set up with admin wallet and XLM token address |
| NodeRegistry   | `set_session_manager(admin, session_manager)`                  | One-time trust link to SessionManager          |
| NodeRegistry   | `register_node(owner, country, endpoint_hash, price, stake)`   | Provider lists a node and locks stake          |
| NodeRegistry   | `deactivate_node` / `reactivate_node`                          | Provider toggles a node offline/online          |
| NodeRegistry   | `withdraw_stake(owner, node_id)`                                | Reclaim stake once a node is inactive           |
| NodeRegistry   | `submit_rating` / `record_earning`                              | Called only by SessionManager                   |
| NodeRegistry   | `get_node` / `list_nodes` / `get_nodes_by_owner`                | Read node data                                  |
| SessionManager | `initialize(admin, registry, token)`                            | Set up with registry + token addresses          |
| SessionManager | `start_session(user, node_id, duration_hours)`                  | Escrow payment, open a session                  |
| SessionManager | `end_session(user, session_id, rating)`                         | Release payment, submit rating to registry      |
| SessionManager | `get_session` / `get_sessions_by_user`                          | Read session data                               |

### Deploy to Testnet

```bash
# Build both contracts
cd contracts
cargo build --target wasm32-unknown-unknown --release

# Deploy NodeRegistry first
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/node_registry.wasm \
  --network testnet --source deployer

# Deploy SessionManager, passing the registry address it will call into
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/session_manager.wasm \
  --network testnet --source deployer

# Initialize NodeRegistry
stellar contract invoke \
  --id NODE_REGISTRY_ADDRESS --network testnet --source deployer \
  -- initialize --admin YOUR_ADDRESS --token XLM_SAC_ADDRESS

# Initialize SessionManager
stellar contract invoke \
  --id SESSION_MANAGER_ADDRESS --network testnet --source deployer \
  -- initialize --admin YOUR_ADDRESS --registry NODE_REGISTRY_ADDRESS --token XLM_SAC_ADDRESS

# Link SessionManager as the trusted caller on NodeRegistry
stellar contract invoke \
  --id NODE_REGISTRY_ADDRESS --network testnet --source deployer \
  -- set_session_manager --admin YOUR_ADDRESS --session_manager SESSION_MANAGER_ADDRESS
```

Full step-by-step instructions (including funding accounts and wiring the frontend) are in `DEPLOYMENT.md`.

---

## Error Handling

| Error                     | Cause                        | User Message                          |
| ------------------------- | ----------------------------- | -------------------------------------- |
| `FREIGHTER_NOT_INSTALLED` | Extension not found           | Link to install Freighter              |
| `WRONG_NETWORK`           | Freighter not on Testnet      | "Switch Freighter to Testnet"          |
| `USER_DECLINED`           | User rejected wallet access   | "Connection cancelled"                 |
| `USER_DECLINED_SIGN`      | User rejected signing         | "Transaction cancelled"                |
| `NODE_NOT_ACTIVE`         | Node deactivated mid-render   | "This node is no longer available"     |
| `INSUFFICIENT_BALANCE`    | Not enough XLM                | Contract rejection message shown as-is |
| `RPC_UNREACHABLE`         | Soroban RPC down/timeout      | "Retry" action on the affected panel   |

Every data-fetching panel (marketplace, sessions, provider, activity) has its own loading skeleton, error state with retry, and empty state — not a single global spinner.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Rust + the `wasm32-unknown-unknown` target, plus the `stellar` CLI (for contract work)
- [Freighter Wallet](https://www.freighter.app/) browser extension set to **Testnet**

### Installation

```bash
git clone https://github.com/shakshi-06/Meridian.git
cd meridian/frontend
npm install
cp .env.example .env   # fill in contract IDs after deploying, see DEPLOYMENT.md
npm run dev
```

Open `http://localhost:5173`

### Get Test XLM

1. Connect Freighter wallet (set to Testnet)
2. Fund your address via [Friendbot](https://friendbot.stellar.org)
3. 10,000 XLM test tokens arrive on your testnet account

---

## Running Tests

**Frontend**

```bash
cd frontend
npm test
```

**Contracts**

```bash
cd contracts
cargo test --workspace
```

| Suite                          | Tests | Covers                                                          |
| ------------------------------- | ----- | ------------------------------------------------------------------ |
| `node_registry/src/test.rs`     | 7     | staking, deactivation, ownership checks, trusted-caller reputation |
| `session_manager/src/test.rs`   | 6     | escrow, cross-contract read/write, duplicate-end and rating guards |
| `NodeCard.test.jsx`             | 3     | render, rent click, disabled state for inactive nodes              |
| `RentDialog.test.jsx`           | 4     | total calculation, confirm/cancel callbacks                         |
| `StatusNotice.test.jsx`         | 4     | roles, title/body/action rendering                                  |
| `NodeMarketplace.test.jsx`      | 4     | loading, loaded, error+retry, empty states                          |

---

## CI/CD Pipeline

GitHub Actions runs on every push to `main` and on pull requests (`.github/workflows/ci.yml`):

**`contracts` job**
1. Install Rust + `wasm32-unknown-unknown` target
2. `cargo test --workspace` (13 contract tests)
3. `cargo build --target wasm32-unknown-unknown --release`

**`frontend` job**
1. `npm ci`
2. `npm run lint`
3. `npm test` (15 frontend tests)
4. `npm run build`

---

## Project Structure

```
meridian/
├── .github/workflows/ci.yml
├── contracts/
│   ├── Cargo.toml                    Workspace
│   ├── node_registry/                Staking, node listings, reputation
│   └── session_manager/              Escrow, pay-per-session, cross-contract calls
├── frontend/
│   ├── src/
│   │   ├── __tests__/                15 passing tests
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── HowItWorks.jsx
│   │   │   ├── NodeMarketplace.jsx / NodeCard.jsx / RentDialog.jsx
│   │   │   ├── SessionDashboard.jsx
│   │   │   ├── ProviderDashboard.jsx
│   │   │   ├── ActivityFeed.jsx      Real-time event streaming
│   │   │   ├── StatusNotice.jsx      Shared loading/error/empty states
│   │   │   ├── ErrorBoundary.jsx
│   │   │   └── Footer.jsx
│   │   ├── context/WalletContext.jsx
│   │   ├── utils/
│   │   │   ├── soroban.js            RPC build/simulate/sign/submit
│   │   │   ├── contracts.js          Typed contract call wrappers
│   │   │   ├── events.js             getEvents polling
│   │   │   ├── freighter.js
│   │   │   ├── latency.js
│   │   │   └── config.js
│   │   ├── App.jsx
│   │   └── index.css
│   └── vercel.json
├── DEPLOYMENT.md                     Full local deploy walkthrough
└── README.md
```

---

## Author

Shakshi Kotwala — (<https://github.com/shakshi-06>)

## License

MIT
