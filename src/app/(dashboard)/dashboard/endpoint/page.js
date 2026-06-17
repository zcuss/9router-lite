import { getMachineId } from "@/shared/utils/machine";
import EndpointRoleRouter from "./EndpointRoleRouter";

export default async function EndpointPage() {
  const machineId = await getMachineId();
  return <EndpointRoleRouter machineId={machineId} />;
}
