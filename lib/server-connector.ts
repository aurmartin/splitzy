import { Env } from "@/lib/env";
import type { Receipt } from "@/lib/expenses";
import type { System } from "@/lib/system";
import { Money, type Currency } from "@/lib/money";

type ReceiptResponse = {
  items: {
    description: string;
    price: number;
    humanReadableDescription: string;
  }[];
  date: string;
  title: string;
};

class ServerConnector {
  constructor(private system: System) {}

  private async authHeaders() {
    const session = await this.system.supabaseConnector.getSession();
    const accessToken = session.data.session?.access_token;

    if (!accessToken) {
      throw new Error("No access token");
    }

    return { Authorization: `Bearer ${accessToken}` };
  }

  async post(path: string, body: any) {
    const authHeaders = await this.authHeaders();
    const headers = {
      ...authHeaders,
      "Content-Type": "application/json",
    };

    const url = `${Env.SERVER_URL}${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to post ${path}: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  async parseReceipt(file: string, currency: Currency): Promise<Receipt> {
    const body = { file };
    const response = (await this.post("/parse-receipt", body)) as ReceiptResponse;

    const items: Receipt["items"] = response.items.map((item) => ({
      description: item.description,
      humanReadableDescription: item.humanReadableDescription,
      price: Money.create({ amount: Math.round(item.price * 100), currency }),
      paid_for: [],
    }));

    const total = items.reduce(
      (acc, item) => {
        return Money.add(acc, item.price);
      },
      Money.create({ amount: 0, currency }),
    );

    return {
      items,
      total,
      date: this.parseDate(response.date) ?? new Date(),
      title: response.title,
    };
  }

  private parseDate(date: string): Date | null {
    const split = date.split("-");
    if (split.length !== 3) {
      return null;
    }

    const year = parseInt(split[0]);
    const month = parseInt(split[1]);
    const day = parseInt(split[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    return new Date(year, month - 1, day);
  }
}

export { ServerConnector };
