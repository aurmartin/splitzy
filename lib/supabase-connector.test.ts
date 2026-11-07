import { createClient } from "@supabase/supabase-js";
import { SupabaseConnector } from "@/lib/supabase-connector";
import type { System } from "@/lib/system";

jest.unmock("@/lib/supabase-connector");
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));

type Row = { id: string };

// Mimics PostgREST: rows sorted by id, never more than `maxRows` per response.
const fakeClient = (rows: Row[], { maxRows = 1000, failOnRequest = -1 } = {}) => {
  const requests: { after?: string; limit?: number }[] = [];

  const from = () => {
    const request: { after?: string; limit?: number } = {};
    const builder = {
      select: () => builder,
      order: () => builder,
      limit: (limit: number) => {
        request.limit = limit;
        return builder;
      },
      gt: (_column: string, value: string) => {
        request.after = value;
        return builder;
      },
      then: (resolve: (result: unknown) => void) => {
        requests.push(request);

        if (requests.length - 1 === failOnRequest) {
          return resolve({ data: null, error: { message: "boom", code: "500" } });
        }

        const page = [...rows]
          .sort((a, b) => a.id.localeCompare(b.id))
          .filter((row) => request.after === undefined || row.id > request.after)
          .slice(0, Math.min(request.limit ?? Infinity, maxRows));

        resolve({ data: page, error: null });
      },
    };
    return builder;
  };

  const channel = { on: () => channel, subscribe: () => channel };

  return { client: { from, channel: () => channel }, requests };
};

const buildRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({ id: String(index).padStart(5, "0") }));

const buildConnector = (client: unknown) => {
  (createClient as jest.Mock).mockReturnValue(client);
  return new SupabaseConnector({ kvStorage: {} } as unknown as System);
};

describe("selectAll", () => {
  it("returns every row when the table holds more than one page", async () => {
    const rows = buildRows(2500);
    const { client, requests } = fakeClient(rows);

    const { data, error } = await buildConnector(client).selectAll("expenses");

    expect(error).toBeNull();
    expect(data).toEqual(rows);
    expect(requests.map(({ after }) => after)).toEqual([undefined, "00999", "01999", "02499"]);
  });

  it("returns every row when the server caps responses below the page size", async () => {
    const rows = buildRows(1200);
    const { client } = fakeClient(rows, { maxRows: 500 });

    const { data } = await buildConnector(client).selectAll("expenses");

    expect(data).toEqual(rows);
  });

  it("returns an empty list for an empty table", async () => {
    const { client } = fakeClient([]);

    const { data, error } = await buildConnector(client).selectAll("groups");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns the error and no partial data when a page fails", async () => {
    const { client } = fakeClient(buildRows(2500), { failOnRequest: 1 });

    const { data, error } = await buildConnector(client).selectAll("expenses");

    expect(data).toBeNull();
    expect(error).toMatchObject({ message: "boom" });
  });
});
