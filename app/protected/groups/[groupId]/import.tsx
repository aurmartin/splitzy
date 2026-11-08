import { useImportGroup } from "@/lib/groups";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import LoadingScreen from "@/components/loading-screen";

export default function GroupImportScreen() {
  const { groupId }: { groupId: string } = useLocalSearchParams();
  const importGroup = useImportGroup();
  const { t } = useTranslation();

  React.useEffect(() => {
    importGroup(groupId).then(() => {
      router.replace("/protected");
    });
  }, [groupId, importGroup]);

  return <LoadingScreen message={t("groups.importing")} />;
}
