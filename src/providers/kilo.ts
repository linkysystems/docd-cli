import { AgentsProvider } from "./agents.js";

export class KiloProvider extends AgentsProvider {
  name = "kilo";
  configKey = "kiloConfigDir";
  legacy = { configDir: ".kilo", agentDirName: "agent", skillDirName: "skills" };
}
