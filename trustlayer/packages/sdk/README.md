# @hamduktrustlayerai/sdk

TypeScript SDK for TrustLayer AI.

## Install

```bash
npm install @hamduktrustlayerai/sdk
```

## Usage

```ts
import TrustLayer from "@hamduktrustlayerai/sdk";

const tl = new TrustLayer({
  apiKey: "tl_live_...",
  baseUrl: "https://trustlayerai.labs.hamduk.com.ng/api"
});

const result = await tl.transaction.analyze({
  customer_id: "customer_123",
  amount: 300000,
  currency: "NGN",
  merchant: "POS Terminal",
  location: "Abuja",
  device_id: "device_abc",
  channel: "mobile"
});

console.log(result);
```

## Methods

```ts
tl.transaction.analyze(payload)
tl.customer.register(payload)
tl.customer.getProfile(externalId)
tl.credit.analyze(payload)
tl.assistant.chat(customerId, message, history)
tl.webhooks.register(payload)
```

## Sandbox Mode

```ts
const tl = new TrustLayer({
  apiKey: "tl_sandbox_...",
  baseUrl: "https://trustlayerai.labs.hamduk.com.ng/api",
  sandbox: true
});
```

## Publish

From the monorepo root:

```bash
npm --workspace @hamduktrustlayerai/sdk run build
npm version patch --workspace @hamduktrustlayerai/sdk
npm publish --workspace @hamduktrustlayerai/sdk --access public
```
