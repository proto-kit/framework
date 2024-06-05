export interface ObjectMapper<SequenceObject, DTO> {
  mapOut: (input: SequenceObject) => DTO;
  mapIn: (input: DTO) => SequenceObject;
}
