import { useSystem } from "@/components/system-provider";
import { ValidationError } from "@/lib/validation-error";
import { GroupRecord, groupsTable } from "@/lib/db/schema";
import { System } from "@/lib/system";
import { generateId, time } from "@/lib/utils";
import { Currency } from "dinero.js";
import { desc, eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useCallback } from "react";

export interface Group {
  id: string;
  name: string;
  currency: Currency;
  members: string[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | undefined;
}

export interface GroupCreateParams {
  name: string;
  currency: Currency;
  members: string[];
}

export const useAddGroup = () => {
  const system = useSystem();

  return useCallback(
    async (params: GroupCreateParams) => addGroup(system, params),
    [system],
  );
};

const addGroup = (system: System, params: GroupCreateParams) =>
  time("addGroup", () => _addGroup(system, params));

const _addGroup = async (system: System, params: GroupCreateParams) => {
  params = checkGroupCreateParams(params);

  const id = generateId();

  try {
    const fields = {
      id,
      name: params.name,
      currency: params.currency,
      members: JSON.stringify(params.members),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    await system.syncEngine.insert(groupsTable, id, fields);
  } catch (error) {
    console.error("Error creating group", error);
    throw error;
  }
};

export const useImportGroup = () => {
  const system = useSystem();

  return useCallback(
    async (groupId: string) => {
      const user = await system.supabaseConnector.client.auth.getUser();

      await system.supabaseConnector.client.from("members").insert({
        user_id: user.data.user!.id,
        group_id: groupId,
      });

      await system.syncEngine.syncTableFromRemote(groupsTable);
    },
    [system],
  );
};

const checkGroupCreateParams = (params: GroupCreateParams) => {
  const errors: Record<string, string> = {};

  params.members = params.members.filter((member) => member.length > 0);

  if (params.name.length === 0) {
    errors.name = "Veuillez entrer un nom";
  }

  if (params.members.length === 0) {
    errors.members = "Veuillez entrer au moins un membre";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return params;
};

const _useGroups = (): Group[] => {
  const system = useSystem();
  const { data } = useLiveQuery(
    system.db.select().from(groupsTable).orderBy(desc(groupsTable.createdAt)),
  );

  return data.map(decodeGroup);
};

export const useGroups = () => time("useGroups", _useGroups);

export const useGroup = (groupId: string): Group | undefined => {
  const system = useSystem();
  return getGroupRow(system, groupId);
};

export const useMe = (groupId: string): string => {
  const system = useSystem();
  const me = getMe(system, groupId);

  if (!me) {
    throw new Error("Me not found");
  }

  return me;
};

export const getMe = (system: System, groupId: string) =>
  system.kvStorage.getItem(`me:${groupId}`);

export const setMe = (system: System, groupId: string, me: string) =>
  system.kvStorage.setItem(`me:${groupId}`, me);

export const removeMe = (system: System, groupId: string) =>
  system.kvStorage.removeItem(`me:${groupId}`);

export const getGroupRow = (
  system: System,
  groupId: string,
): Group | undefined => {
  const group = system.db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1)
    .all();

  if (group.length === 0) {
    return undefined;
  }

  return decodeGroup(group[0]);
};

const decodeGroup = (groupRecord: GroupRecord): Group => {
  return {
    id: groupRecord.id,
    name: groupRecord.name as string,
    members: JSON.parse(groupRecord.members as string),
    currency: groupRecord.currency as Currency,
    createdAt: new Date(groupRecord.createdAt as string),
    updatedAt: new Date(groupRecord.updatedAt as string),
    deletedAt: groupRecord.deletedAt
      ? new Date(groupRecord.deletedAt as string)
      : undefined,
  };
};
