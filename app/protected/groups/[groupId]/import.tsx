import { useImportGroup } from "@/lib/groups";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import LoadingScreen from "@/components/loading-screen";

export default function GroupImportScreen() {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const importGroup = useImportGroup();

  React.useEffect(() => {
    importGroup(groupId).then(() => {
      router.replace("/protected");
    });
  }, [groupId, importGroup]);

  return <LoadingScreen message="Importing group..." />;
}
