type HistoryMessage = {
  role: string;
  content: string;
};

type TrustLayerOptions = {
  apiKey: string;
  baseUrl?: string;
  sandbox?: boolean;
  fetcher?: typeof fetch;
};

class TrustLayer {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;
  private readonly fetcher: typeof fetch;

  constructor(options: TrustLayerOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "http://localhost:3001";
    this.sandbox = options.sandbox || false;
    this.fetcher = options.fetcher || fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${this.sandbox ? "/v1/sandbox" : "/v1"}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-trustlayer-key": this.apiKey,
        ...(init?.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`TrustLayer request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  transaction = {
    analyze: (payload: {
      customerId?: string;
      customer_id?: string;
      amount: number;
      currency?: string;
      merchant?: string;
      location?: string;
      deviceId?: string;
      device_id?: string;
      channel?: string;
    }) => this.request("/transaction/analyze", {
      method: "POST",
      body: JSON.stringify({
        customer_id: payload.customerId || payload.customer_id,
        amount: payload.amount,
        currency: payload.currency,
        merchant: payload.merchant,
        location: payload.location,
        device_id: payload.deviceId || payload.device_id,
        channel: payload.channel
      })
    })
  };

  customer = {
    register: (payload: { externalId?: string; external_id?: string; bvnHash?: string; bvn_hash?: string; phoneHash?: string; phone_hash?: string }) =>
      this.request("/customer/register", {
        method: "POST",
        body: JSON.stringify({
          external_id: payload.externalId || payload.external_id,
          bvn_hash: payload.bvnHash || payload.bvn_hash,
          phone_hash: payload.phoneHash || payload.phone_hash
        })
      }),
    getProfile: (externalId: string) =>
      this.request(`/customer/${externalId}/profile`, { method: "GET" })
  };

  credit = {
    analyze: (payload: { customerId?: string; customer_id?: string; dataType?: string; data_type?: string; data: Record<string, unknown> }) =>
      this.request("/credit/analyze", {
        method: "POST",
        body: JSON.stringify({
          customer_id: payload.customerId || payload.customer_id,
          data_type: payload.dataType || payload.data_type,
          data: payload.data
        })
      })
  };

  assistant = {
    chat: (customerId: string, message: string, history: HistoryMessage[] = []) =>
      this.request("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId,
          message,
          history
        })
      })
  };

  webhooks = {
    register: (payload: { url: string; events: string[]; secret: string }) =>
      this.request("/webhooks/register", { method: "POST", body: JSON.stringify(payload) })
  };
}

export default TrustLayer;
export type { TrustLayerOptions, HistoryMessage };
