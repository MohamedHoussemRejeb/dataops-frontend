// src/app/features/lineage/flow-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FlowNodeType = 'dataset' | 'job' | 'report';

export interface FlowNode {
  id: string;
  label: string;
  type: FlowNodeType;
  level: number;
}

export interface FlowEdge {
  from: string;
  to: string;
  kind: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

@Injectable({ providedIn: 'root' })
export class FlowApi {
  constructor(private http: HttpClient) {}

  flow(
    fromUrn: string,
    depth: number = 2,
    type: 'downstream' | 'upstream' = 'downstream'
  ): Observable<FlowGraph> {
    let params = new HttpParams()
      .set('from', fromUrn)
      .set('depth', depth.toString())
      .set('type', type);

    console.log('[FlowApi] calling /api/lineage/flow', params.toString());

    return this.http.get<FlowGraph>('/api/lineage/flow', { params });
  }
}
