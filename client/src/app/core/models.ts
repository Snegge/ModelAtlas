export type Status = "gpu-fit" | "offload" | "outside-budget" | "unknown";
export interface Hardware {
  gpuGiB: number;
  ramGiB: number;
  contextTokens: number;
  quantization: string;
  allowOffload: boolean;
  cachePrecision: string;
  concurrency: number;
}
export interface Architecture {
  type: string | null;
  layers: number | null;
  hiddenSize: number | null;
  attentionHeads: number | null;
  kvHeads: number | null;
  headDim: number | null;
  experts: number | null;
  slidingWindow: number | null;
  sourceUrl: string;
}
export interface Release {
  id: string;
  name: string;
  publisher: string;
  family: string;
  releaseIdentifier: string;
  totalParameters: number | null;
  activeParameters: number | null;
  contextLimit: number | null;
  contextSource: string;
  architecture: Architecture;
  license: string | null;
  licenseUrl: string;
  modelCardUrl: string;
  revision: string;
  retrievedAt: string;
  validationStatus: string;
  missingFields: string[];
}
export interface Artifact {
  id: string;
  releaseId: string;
  repository: string;
  revision: string;
  quantization: string;
  format: string;
  sizeBytes: number;
  files: { path: string; sizeBytes: number; sha256: string; url: string }[];
  sourceUrl: string;
  retrievedAt: string;
  validationStatus: string;
  missingFields: string[];
}
export interface Catalog {
  releases: Release[];
  artifacts: Artifact[];
}
export interface Estimate {
  artifactId: string;
  status: Status;
  weightsGiB: number | null;
  cacheGiB: number | null;
  runtimeGiB: number | null;
  safetyGiB: number | null;
  totalGiB: number | null;
  gpuRequiredGiB: number | null;
  systemRequiredGiB: number | null;
  contextSatisfied: boolean | null;
  estimatorVersion: string;
  runtimeCompatibility: string;
  assumptions: string[];
  reasons: string[];
}
export interface Point {
  releaseId: string;
  artifactId: string;
  baselineArtifactId: string | null;
  scenario: Estimate;
  baseline: Estimate | null;
  change: string;
  representativeChanged: boolean;
  preferenceMatched: boolean;
}
export interface ArtifactEvaluation {
  artifactId: string;
  scenario: Estimate;
  baseline: Estimate | null;
}
export interface Evaluation {
  settings: Hardware;
  baseline: Hardware | null;
  releases: Point[];
  artifacts: ArtifactEvaluation[];
  estimatorVersion: string;
}
export interface Coverage {
  retrievedAt: string;
  importerVersion: string;
  estimatorVersion: string;
  releaseCount: number;
  artifactCount: number;
  incompleteReleases: number;
  families: { name: string; count: number }[];
  quantizations: string[];
  importIssues: { repository: string; reason: string }[];
  source: string;
}
export interface Filters {
  search: string;
  family: string;
  quantization: string;
  fitsOnly: boolean;
  sort: string;
}
export const STATUS_LABEL: Record<Status, string> = {
  "gpu-fit": "Estimated GPU fit",
  offload: "Possible with offloading",
  "outside-budget": "Outside constraints",
  unknown: "Insufficient information",
};
export const STATUS_SYMBOL: Record<Status, string> = {
  "gpu-fit": "●",
  offload: "◆",
  "outside-budget": "▲",
  unknown: "■",
};
export const DEFAULTS: Hardware = {
  gpuGiB: 12,
  ramGiB: 32,
  contextTokens: 8192,
  quantization: "Q4_K_M",
  allowOffload: true,
  cachePrecision: "f16",
  concurrency: 1,
};
export const EMPTY_FILTERS: Filters = {
  search: "",
  family: "",
  quantization: "",
  fitsOnly: false,
  sort: "memory",
};
