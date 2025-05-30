import { System } from "@/lib/system";
import React from "react";

const SystemContext = React.createContext<System | null>(null);

const SystemProvider = ({
  children,
  system,
}: {
  children: React.ReactNode;
  system: System;
}) => {
  return (
    <SystemContext.Provider value={system}>{children}</SystemContext.Provider>
  );
};

const useSystem = () => {
  const system = React.useContext(SystemContext);

  if (!system) {
    throw new Error("System not found");
  }

  return system;
};

export { SystemContext, SystemProvider, useSystem };
