import { tables } from "@/lib/db/schema";

type OperationType = "insert" | "update" | "delete";

interface SyncOperation {
  id: string;
  operationType: OperationType;
  entityId: string;
  entityTable: keyof typeof tables;
  changes: Record<string, any> | undefined;
  createdAt: Date;
}

type RemoteOperation = Omit<SyncOperation, "createdAt" | "id">;

export { type OperationType, type RemoteOperation, type SyncOperation };
