import { Env } from "@/lib/env";
import type { Receipt } from "@/lib/expenses";
import type { System } from "@/lib/system";
import dinero, { Currency } from "dinero.js";

const CURRENCIES = [
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BOV",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  "CAD",
  "CDF",
  "CHE",
  "CHF",
  "CHW",
  "CLF",
  "CLP",
  "CNY",
  "COP",
  "COU",
  "CRC",
  "CUC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "GBP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HRK",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MXV",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLL",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SVC",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "USD",
  "USN",
  "UYI",
  "UYU",
  "UYW",
  "UZS",
  "VES",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XAG",
  "XAU",
  "XBA",
  "XBB",
  "XBC",
  "XBD",
  "XCD",
  "XDR",
  "XOF",
  "XPD",
  "XPF",
  "XPT",
  "XSU",
  "XTS",
  "XUA",
  "XXX",
  "YER",
  "ZAR",
  "ZMW",
  "ZWL",
];

type ReceiptResponse = {
  items: {
    description: string;
    price: number;
    humanReadableDescription: string;
  }[];
  currency: string;
  date: string;
  title: string;
};

class ServerConnector {
  constructor(private system: System) {}

  private async authHeaders() {
    const session = await this.system.supabaseConnector.getSession();
    const accessToken = session.data.session?.access_token;
    const refreshToken = session.data.session?.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error("No access token or refresh token");
    }

    return {
      Authorization: accessToken,
      "x-refresh-token": refreshToken,
    };
  }

  async post(path: string, body: any) {
    const authHeaders = await this.authHeaders();
    const headers = {
      ...authHeaders,
      "Content-Type": "application/json",
    };

    // const url = `${Env.SERVER_URL}${path}`;
    const url = "https://splitzy.aurmartin.fr" + path;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to post ${path}: ${response.status} - ${response.statusText}`,
      );
    }

    return response.json();
  }

  async parseReceipt(file: string): Promise<Receipt> {
    const body = { file };
    const response = (await this.post(
      "/parse-receipt",
      body,
    )) as ReceiptResponse;

    const currency = "EUR";

    const items: Receipt["items"] = response.items.map((item) => ({
      description: item.description,
      humanReadableDescription: item.humanReadableDescription,
      price: dinero({ amount: Math.round(item.price * 100), currency }),
      paid_for: [],
    }));

    const total = items.reduce(
      (acc, item) => {
        return acc.add(item.price);
      },
      dinero({ amount: 0, currency }),
    );

    return {
      items,
      total,
      date: this.parseDate(response.date) ?? new Date(),
      title: response.title,
      currency: this.parseCurrency(response.currency) ?? "EUR",
    } as Receipt;
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

  private parseCurrency(currency: string): Currency | null {
    if (CURRENCIES.includes(currency)) {
      return currency as Currency;
    }

    return null;
  }
}

export { ServerConnector };
