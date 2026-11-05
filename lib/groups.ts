import { useSystem } from "@/components/system-provider";
import { DisplayableError } from "@/lib/displayable-error";
import { ValidationError } from "@/lib/validation-error";
import { GroupRecord, groupsTable } from "@/lib/db/schema";
import {
  ExpenseService,
  ExpensesRepository,
  type Expense,
} from "@/lib/expenses";
import { System } from "@/lib/system";
import { generateId, time } from "@/lib/utils";
import { type Currency } from "@/lib/money";
import { desc, eq, isNull } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";

export type Group = {
  id: string;
  name: string;
  currency: Currency;
  members: string[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | undefined;
};

export type GroupCreateParams = {
  name: string;
  currency: Currency;
  members: string[];
};

export type GroupUpdateParams = {
  name: string;
  members: string[];
};

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
      const user = await system.supabaseConnector.getUser();

      await system.supabaseConnector.insert("members", {
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

function getGroups(system: System): Group[] {
  return system.db
    .select()
    .from(groupsTable)
    .where(isNull(groupsTable.deletedAt))
    .orderBy(desc(groupsTable.createdAt))
    .all()
    .map(decodeGroup);
}

const _useGroups = (): Group[] => {
  const system = useSystem();

  const initialGroups = useMemo(() => getGroups(system), [system]);

  const [groups, setGroups] = useState<Group[]>(initialGroups);

  useEffect(() => {
    return system.syncEngine.watchTable(groupsTable, () =>
      setGroups(getGroups(system)),
    );
  }, [system]);

  return groups;
};

export const useGroups = () => time("useGroups", _useGroups);

export const useGroup = (groupId: string): Group | undefined => {
  const system = useSystem();
  const initialGroup = useMemo(
    () => getGroupRow(system, groupId),
    [system, groupId],
  );
  const [group, setGroup] = useState(initialGroup);

  useEffect(() => {
    setGroup(getGroupRow(system, groupId));

    return system.syncEngine.watchTable(groupsTable, () =>
      setGroup(getGroupRow(system, groupId)),
    );
  }, [system, groupId]);

  return group;
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

// Members an expense of the group refers to, as payer or as participant.
// Expenses store member names, so these members can't be removed.
export const getMembersInExpenses = (expenses: Expense[]): Set<string> => {
  const members = new Set<string>();

  for (const expense of expenses) {
    members.add(expense.payerName);
    expense.splitExpense.members.forEach((member) => members.add(member));
    Object.keys(ExpenseService.getAmounts(expense)).forEach((member) =>
      members.add(member),
    );
  }

  return members;
};

const sameName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

const validateGroupUpdateParams = (
  system: System,
  group: Group,
  params: GroupUpdateParams,
): GroupUpdateParams => {
  const name = params.name.trim();
  const members = params.members
    .map((member) => member.trim())
    .filter((member) => member.length > 0);

  if (name.length === 0) {
    throw new DisplayableError("Le nom est invalide", "Veuillez entrer un nom");
  }

  if (members.length === 0) {
    throw new DisplayableError(
      "Les membres sont invalides",
      "Veuillez entrer au moins un membre",
    );
  }

  const duplicate = members.find((member, index) =>
    members.slice(0, index).some((other) => sameName(member, other)),
  );
  if (duplicate) {
    throw new DisplayableError(
      "Les membres sont invalides",
      `${duplicate} fait déjà partie du groupe`,
    );
  }

  const removed = group.members.filter((member) => !members.includes(member));
  const me = getMe(system, group.id);

  if (me && removed.includes(me)) {
    throw new DisplayableError(
      "Impossible de retirer ce membre",
      "Vous ne pouvez pas vous retirer vous-même. Quittez le groupe à la place.",
    );
  }

  const membersInExpenses = getMembersInExpenses(
    ExpensesRepository.getGroupExpenses(system, group.id),
  );
  const used = removed.find((member) => membersInExpenses.has(member));
  if (used) {
    throw new DisplayableError(
      "Impossible de retirer ce membre",
      `${used} apparaît dans des dépenses du groupe. Supprimez-les d'abord.`,
    );
  }

  return { name, members };
};

const getGroupOrThrow = (system: System, groupId: string): Group => {
  const group = getGroupRow(system, groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  return group;
};

export const updateGroup = async (
  system: System,
  groupId: string,
  params: GroupUpdateParams,
) => {
  const group = getGroupOrThrow(system, groupId);
  const { name, members } = validateGroupUpdateParams(system, group, params);

  await system.syncEngine.update(groupsTable, groupId, {
    name,
    members: JSON.stringify(members),
    updatedAt: new Date().toISOString(),
  });
};

export const deleteGroup = async (system: System, groupId: string) => {
  getGroupOrThrow(system, groupId);

  const now = new Date().toISOString();

  await system.syncEngine.update(groupsTable, groupId, {
    deletedAt: now,
    updatedAt: now,
  });

  removeMe(system, groupId);
};

// Needs the network, since the membership lives in Supabase only.
export const leaveGroup = async (system: System, groupId: string) => {
  // Push pending changes first: once out of the group, Supabase refuses them.
  await system.syncEngine.processLocalOperations();

  const { error } = await system.supabaseConnector.leaveGroup(groupId);

  if (error) {
    throw error;
  }

  // The group and its expenses are no longer visible remotely: syncing
  // removes them from the local database.
  await system.syncEngine.syncAllTablesFromRemote();

  removeMe(system, groupId);
};
