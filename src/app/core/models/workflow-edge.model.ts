export interface WorkflowEdge {
  id?: number;
  fromJob: string;
  toJob: string;
  enabled: boolean;
  onSuccessOnly: boolean;
}