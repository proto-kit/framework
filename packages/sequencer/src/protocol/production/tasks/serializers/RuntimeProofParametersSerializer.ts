import { TaskSerializer } from "../../../../worker/flow/Task";
import type { RuntimeProofParametersJson } from "../RuntimeProvingTask";

/**
 * Serializer for RuntimeProofParametersJson.
 * Since RuntimeProofParametersJson is already JSON-compatible, this is trivial.
 */
export class RuntimeProofParametersSerializer
  implements TaskSerializer<RuntimeProofParametersJson>
{
  public toJSON(parameters: RuntimeProofParametersJson): string {
    return JSON.stringify(parameters);
  }

  public fromJSON(json: string): RuntimeProofParametersJson {
    return JSON.parse(json) as RuntimeProofParametersJson;
  }
}

