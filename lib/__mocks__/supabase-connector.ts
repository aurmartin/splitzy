const { SupabaseConnector } = jest.requireActual<
  typeof import("@/lib/supabase-connector")
>("@/lib/supabase-connector");

jest.spyOn(SupabaseConnector.prototype, "selectAll").mockResolvedValue({
  data: [],
  error: null,
  count: 0,
  status: 200,
  statusText: "OK",
});

jest.spyOn(SupabaseConnector.prototype, "insert").mockResolvedValue({
  data: null,
  error: null,
  count: 0,
  status: 200,
  statusText: "OK",
});

jest.spyOn(SupabaseConnector.prototype, "update").mockResolvedValue({
  data: null,
  error: null,
  count: 0,
  status: 200,
  statusText: "OK",
});

jest.spyOn(SupabaseConnector.prototype, "delete").mockResolvedValue({
  data: null,
  error: null,
  count: 0,
  status: 200,
  statusText: "OK",
});

jest.spyOn(SupabaseConnector.prototype, "signInWithOtp").mockResolvedValue({
  error: null,
  data: { user: null, session: null },
});

jest.spyOn(SupabaseConnector.prototype, "getSession").mockResolvedValue({
  data: { session: null },
  error: null,
});

jest.spyOn(SupabaseConnector.prototype, "setSession").mockResolvedValue({
  data: { user: null, session: null },
  error: null,
});

export { SupabaseConnector };
