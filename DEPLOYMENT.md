# Deployment Guide (run these on your machine)

I can't reach Stellar's testnet RPC, Freighter, or your Vercel account from my sandbox, so everything past "clone the repo" happens on your machine. This is written for Windows PowerShell since that's what you use; swap `$env:VAR` / backtick line-continuations for bash equivalents if you're on WSL or Mac.

## 0. One-time tool install

```powershell
# Rust + wasm target
winget install Rustlang.Rustup
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli --features opt

# Confirm
stellar --version
cargo --version
```

## 1. Create and fund a deployer identity

```powershell
stellar keys generate deployer --network testnet --fund
stellar keys address deployer
```

Copy that `G...` address — that's your deployer account, already funded with test XLM via Friendbot.

## 2. Build the contracts

```powershell
cd veilnet\contracts
cargo test --workspace          # confirm all 13 tests pass first
cargo build --target wasm32-unknown-unknown --release
```

WASM files land in `contracts\target\wasm32-unknown-unknown\release\node_registry.wasm` and `...\session_manager.wasm`.

## 3. Deploy NodeRegistry

```powershell
stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/node_registry.wasm `
  --network testnet --source deployer
```

This prints a contract ID like `CA...`. Save it as `NODE_REGISTRY_ID`.

## 4. Deploy SessionManager

```powershell
stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/session_manager.wasm `
  --network testnet --source deployer
```

Save this one as `SESSION_MANAGER_ID`.

## 5. Get the native XLM SAC address for testnet

```powershell
stellar contract id asset --asset native --network testnet
```

Save as `XLM_SAC_ID` (this is the same on every testnet deploy: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`).

## 6. Initialize both contracts and link them

```powershell
$DEPLOYER = stellar keys address deployer

stellar contract invoke `
  --id $NODE_REGISTRY_ID --network testnet --source deployer `
  -- initialize --admin $DEPLOYER --token $XLM_SAC_ID

stellar contract invoke `
  --id $SESSION_MANAGER_ID --network testnet --source deployer `
  -- initialize --admin $DEPLOYER --registry $NODE_REGISTRY_ID --token $XLM_SAC_ID

stellar contract invoke `
  --id $NODE_REGISTRY_ID --network testnet --source deployer `
  -- set_session_manager --admin $DEPLOYER --session_manager $SESSION_MANAGER_ID
```

## 7. Wire the frontend to your deployed contracts

```powershell
cd ..\frontend
copy .env.example .env
```

Open `.env` and fill in:

```
VITE_NODE_REGISTRY_CONTRACT_ID=<NODE_REGISTRY_ID from step 3>
VITE_SESSION_MANAGER_CONTRACT_ID=<SESSION_MANAGER_ID from step 4>
VITE_XLM_SAC_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`, connect Freighter (make sure it's switched to **Testnet** in the extension settings), and confirm the marketplace loads with no nodes yet — that confirms the RPC connection and contract IDs are correct.

## 8. Produce a real transaction hash for the README

Register one node from the Provider tab (stake ≥ 50 XLM), then rent it from the Marketplace tab and end the session. Each of those actions gives you a transaction hash in the confirmation banner and a link to Stellar Expert — grab one for the README's "Transaction Hash" field. This also doubles as your CI-required "test output" walkthrough for the demo video.

## 9. Take the required screenshots

Save these into `docs/screenshots/` at the repo root (create the folder):

- `mobile-marketplace.png`, `mobile-session.png`, `mobile-provider.png` — resize your browser to ~375px wide (or open real DevTools device mode) and screenshot the Marketplace, Session Dashboard, and Provider Dashboard views
- `desktop-hero.png` — full-width home view
- `wallet-connected.png` — navbar with the connected wallet chip visible
- `rent-flow.png` — the Rent dialog mid-flow
- `ci-pipeline.png` — the green run on the **Actions** tab of your GitHub repo, after step 12 below
- `test-output.png` — terminal output of `npm test` (frontend) or `cargo test` (contracts) showing passing tests

Then replace the placeholder lines in `README.md`'s Screenshots section with real `![alt](docs/screenshots/...)` markdown image tags.

## 10. Deploy the frontend with Vercel CLI

```powershell
npm install -g vercel   # if not already installed
cd veilnet\frontend
vercel login
vercel link
vercel env add VITE_NODE_REGISTRY_CONTRACT_ID production
vercel env add VITE_SESSION_MANAGER_CONTRACT_ID production
vercel env add VITE_XLM_SAC_CONTRACT_ID production
vercel --prod
```

Grab the `https://....vercel.app` URL from the output — that's the Live Demo link for the README and submission form.

## 11. Push everything to GitHub

You already have commits made locally as this was built. From the `veilnet` folder:

```powershell
git remote add origin https://github.com/shakshi-06/veilnet.git
git branch -M main
git push -u origin main
```

If `veilnet` doesn't exist yet on your GitHub account, create it first at github.com/new (public, no README/gitignore/license — this repo already has them), then run the commands above.

From here on, keep committing as you do the remaining work — updating the README with real contract IDs and screenshots, tweaking anything after testing — so your commit history naturally grows past 10. Small, real commits (`docs: add contract addresses and tx hash`, `docs: add screenshots`, `fix: correct XLM SAC id for testnet`) are better for the "10+ meaningful commits" requirement than one giant commit at the end.

## 12. Confirm CI is green

Push triggers `.github/workflows/ci.yml` automatically. Check the **Actions** tab on GitHub — both the `contracts` and `frontend` jobs should pass. This is also where you grab the `ci-pipeline.png` screenshot from step 9.

## 13. Record the demo video (1–2 minutes)

Suggested flow: connect Freighter → show the marketplace with your live node → rent it (show the Freighter signing popup) → switch to Session Dashboard to show the countdown → end the session and rate it → switch to Provider Dashboard to show the earnings tick up → briefly show the Activity Feed updating → end on the two contract addresses in the footer. Upload to Google Drive or YouTube (unlisted) and drop the link at the top of `README.md` and in your submission.

## Troubleshooting

- **"Contract rejected the call" on register_node** — you're below the 50 XLM minimum stake, or your Freighter account has no XLM. Fund it via Friendbot.
- **Marketplace stuck loading** — check `.env` contract IDs are correct and you ran `npm run dev` after saving `.env` (Vite only reads env vars at server start).
- **Freighter signs but tx never confirms** — check Freighter is set to Testnet, not Mainnet or Futurenet; the app hard-checks this and will show an error banner if not.
- **`cargo build` fails to find `wasm32-unknown-unknown`** — run `rustup target add wasm32-unknown-unknown` again; some Rust installs need it added per-toolchain after an update.
