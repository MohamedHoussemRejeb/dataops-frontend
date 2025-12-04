export type Layer = 'source'|'staging'|'dw'|'mart';
export type Status = 'OK'|'RUNNING'|'LATE'|'FAILED'|'UNKNOWN';

export interface NodeMeta {
  id: string;
  label: string;
  layer: Layer;
  domain?: string;
  owner?: string;
  lastStatus?: Status;
  lastEndedAt?: string;
  table?: string;
  columns?: string[];
}

export interface EdgeMeta {
  from: string;
  to: string;
  type?: 'transform'|'copy'|'join';
}

export interface LineageGraph {
  nodes: NodeMeta[];
  edges: EdgeMeta[];
}
