import { ArtifactRecord } from "@proto-kit/common";

import { VerificationKeySerializer } from "./VerificationKeySerializer";

export type SerializedArtifactRecord = Record<
  string,
  { verificationKey: { hash: string; data: string } }
>;

export class ArtifactRecordSerializer {
  public toJSON(input: ArtifactRecord): SerializedArtifactRecord {
    const temp: SerializedArtifactRecord = Object.keys(
      input
    ).reduce<SerializedArtifactRecord>((accum, key) => {
      return {
        ...accum,
        [key]: {
          verificationKey: VerificationKeySerializer.toJSON(
            input[key].verificationKey
          ),
        },
      };
    }, {});
    return temp;
  }

  public fromJSON(json: SerializedArtifactRecord): ArtifactRecord {
    if (json === undefined || json === null) return {};

    return Object.keys(json).reduce<ArtifactRecord>((accum, key) => {
      return {
        ...accum,
        [key]: {
          verificationKey: VerificationKeySerializer.fromJSON(
            json[key].verificationKey
          ),
        },
      };
    }, {});
  }
}
