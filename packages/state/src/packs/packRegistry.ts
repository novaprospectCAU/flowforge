/**
 * PackRegistry — 팩 등록, 활성화/비활성화, localStorage 영속화
 */

import { nodeTypeRegistry } from '../nodeTypes';
import { executorRegistry } from '../execution/executorRegistry';
import { STORAGE_KEYS } from '../utils';
import type {
  PackManifest,
  PackState,
  BuiltinNodePack,
  CustomNodePack,
  SerializedCustomPack,
  SubflowNodeDefinition,
} from './types';
import { createSubflowExecutor } from './subflowExecutor';

type PackListener = () => void;

class PackRegistry {
  /** 등록된 빌트인 팩들 */
  private builtinPacks: Map<string, BuiltinNodePack> = new Map();
  /** 설치된 커스텀 팩들 */
  private customPacks: Map<string, CustomNodePack> = new Map();
  /** 팩별 상태 (enabled, installedAt 등) */
  private packStates: Map<string, PackState> = new Map();
  /** React 리렌더 트리거 리스너 */
  private listeners: Set<PackListener> = new Set();

  /**
   * localStorage에서 팩 상태를 로드하고, 커스텀 팩 복원
   */
  initialize(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PACK_STATES);
      if (!raw) return;

      const states: PackState[] = JSON.parse(raw);
      for (const state of states) {
        this.packStates.set(state.packId, state);

        // 커스텀 팩 복원
        if (state.serializedPack) {
          this.restoreCustomPack(state.serializedPack);
        }

        // 활성화된 팩 재등록
        if (state.enabled) {
          this.enablePackInternal(state.packId);
        }
      }
    } catch {
      // localStorage 파싱 실패 시 무시
    }
  }

  /**
   * 빌트인 팩 등록 (비활성 상태)
   */
  registerBuiltinPack(pack: BuiltinNodePack): void {
    this.builtinPacks.set(pack.manifest.id, pack);
    // 이미 저장된 상태가 없으면 기본 상태 생성
    if (!this.packStates.has(pack.manifest.id)) {
      this.packStates.set(pack.manifest.id, {
        packId: pack.manifest.id,
        enabled: false,
        installedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 커스텀 팩 설치
   */
  installCustomPack(serialized: SerializedCustomPack): void {
    const packId = serialized.manifest.id;

    // 기존 팩이 있으면 먼저 비활성화
    if (this.isEnabled(packId)) {
      this.disablePack(packId);
    }

    this.restoreCustomPack(serialized);

    this.packStates.set(packId, {
      packId,
      enabled: false,
      installedAt: new Date().toISOString(),
      serializedPack: serialized,
    });

    this.saveStates();
    this.notify();
  }

  /**
   * 팩 제거
   */
  uninstallPack(packId: string): void {
    // 비활성화 먼저
    if (this.isEnabled(packId)) {
      this.disablePack(packId);
    }

    this.customPacks.delete(packId);
    this.packStates.delete(packId);

    this.saveStates();
    this.notify();
  }

  /**
   * 팩 활성화 — nodeTypeRegistry + executorRegistry에 등록
   */
  enablePack(packId: string): void {
    this.enablePackInternal(packId);

    const state = this.packStates.get(packId);
    if (state) {
      state.enabled = true;
      this.saveStates();
    }

    this.notify();
  }

  /**
   * 팩 비활성화 — 양쪽 레지스트리에서 unregister
   */
  disablePack(packId: string): void {
    const builtin = this.builtinPacks.get(packId);
    const custom = this.customPacks.get(packId);
    const pack = builtin || custom;

    if (pack) {
      for (const nodeDef of pack.nodes) {
        nodeTypeRegistry.unregister(nodeDef.nodeType.type);
        executorRegistry.unregister(nodeDef.nodeType.type);
      }
    }

    const state = this.packStates.get(packId);
    if (state) {
      state.enabled = false;
      this.saveStates();
    }

    this.notify();
  }

  /**
   * 모든 팩 조회 (manifest + state)
   */
  getAllPacks(): Array<{ manifest: PackManifest; state: PackState }> {
    const result: Array<{ manifest: PackManifest; state: PackState }> = [];

    for (const [id, pack] of this.builtinPacks) {
      const state = this.packStates.get(id);
      if (state) {
        result.push({ manifest: pack.manifest, state });
      }
    }

    for (const [id, pack] of this.customPacks) {
      const state = this.packStates.get(id);
      if (state) {
        result.push({ manifest: pack.manifest, state });
      }
    }

    return result;
  }

  getPackState(packId: string): PackState | undefined {
    return this.packStates.get(packId);
  }

  isEnabled(packId: string): boolean {
    return this.packStates.get(packId)?.enabled ?? false;
  }

  getPackManifest(packId: string): PackManifest | undefined {
    return this.builtinPacks.get(packId)?.manifest
      ?? this.customPacks.get(packId)?.manifest;
  }

  getPackNodes(packId: string): { nodeType: import('../nodeTypes').NodeTypeDefinition; defaultData?: Record<string, unknown> }[] {
    const pack = this.builtinPacks.get(packId) ?? this.customPacks.get(packId);
    return pack?.nodes ?? [];
  }

  /**
   * 커스텀 팩 JSON export
   */
  exportPack(packId: string): SerializedCustomPack | null {
    const state = this.packStates.get(packId);
    if (state?.serializedPack) {
      return state.serializedPack;
    }
    return null;
  }

  /**
   * Import 미리보기 — 유효성 검증 후 반환
   */
  previewImport(json: string): SerializedCustomPack | null {
    try {
      const parsed = JSON.parse(json) as SerializedCustomPack;
      if (!this.validatePack(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * 커스텀 팩에 노드 추가
   */
  addNodeToCustomPack(
    packId: string,
    nodeType: import('../nodeTypes').NodeTypeDefinition,
    defaultData: Record<string, unknown> | undefined,
    subflowDef: SubflowNodeDefinition
  ): void {
    const pack = this.customPacks.get(packId);
    if (!pack) return;

    pack.nodes.push({ nodeType, defaultData });
    pack.subflowDefinitions.set(nodeType.type, subflowDef);

    // 활성화 중이면 즉시 등록
    if (this.isEnabled(packId)) {
      nodeTypeRegistry.register(nodeType);
      const executor = createSubflowExecutor(subflowDef);
      executorRegistry.register(nodeType.type, executor);
    }

    // serializedPack 업데이트
    this.updateSerializedPack(packId);
    this.saveStates();
    this.notify();
  }

  /**
   * 새 빈 커스텀 팩 생성
   */
  createCustomPack(manifest: PackManifest & { kind: 'custom' }): void {
    const pack: CustomNodePack = {
      manifest,
      nodes: [],
      subflowDefinitions: new Map(),
    };
    this.customPacks.set(manifest.id, pack);
    this.packStates.set(manifest.id, {
      packId: manifest.id,
      enabled: false,
      installedAt: new Date().toISOString(),
      serializedPack: { manifest, nodes: [] },
    });

    this.saveStates();
    this.notify();
  }

  /**
   * 활성화된 모든 팩의 ID 목록
   */
  getEnabledPackIds(): string[] {
    return Array.from(this.packStates.entries())
      .filter(([, s]) => s.enabled)
      .map(([id]) => id);
  }

  /**
   * 리렌더 트리거 구독
   */
  subscribe(listener: PackListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  // === Private ===

  /**
   * 팩 유효성 검증
   */
  private validatePack(pack: SerializedCustomPack): boolean {
    if (!pack.manifest || !pack.nodes) return false;
    if (pack.manifest.kind !== 'custom') return false;
    if (!pack.manifest.id || !pack.manifest.name) return false;
    if (!Array.isArray(pack.nodes)) return false;

    for (const node of pack.nodes) {
      if (!node.nodeType?.type || !node.nodeType?.title) return false;
      // 네임스페이스 확인: 타입에 ":" 포함 필수
      if (!node.nodeType.type.includes(':')) return false;
      if (!node.subflow) return false;
      if (!Array.isArray(node.subflow.nodes) || !Array.isArray(node.subflow.edges)) return false;
      if (!Array.isArray(node.nodeType.inputs) || !Array.isArray(node.nodeType.outputs)) return false;
    }

    return true;
  }

  private enablePackInternal(packId: string): void {
    const builtin = this.builtinPacks.get(packId);
    if (builtin) {
      for (const nodeDef of builtin.nodes) {
        nodeTypeRegistry.register(nodeDef.nodeType);
        const executor = builtin.executors.get(nodeDef.nodeType.type);
        if (executor) {
          executorRegistry.register(nodeDef.nodeType.type, executor);
        }
      }
      return;
    }

    const custom = this.customPacks.get(packId);
    if (custom) {
      for (const nodeDef of custom.nodes) {
        nodeTypeRegistry.register(nodeDef.nodeType);
        const subflowDef = custom.subflowDefinitions.get(nodeDef.nodeType.type);
        if (subflowDef) {
          const executor = createSubflowExecutor(subflowDef);
          executorRegistry.register(nodeDef.nodeType.type, executor);
        }
      }
    }
  }

  private restoreCustomPack(serialized: SerializedCustomPack): void {
    const packId = serialized.manifest.id;
    const subflowDefs = new Map<string, SubflowNodeDefinition>();
    const nodes = serialized.nodes.map(n => {
      subflowDefs.set(n.nodeType.type, n.subflow);
      return { nodeType: n.nodeType, defaultData: n.defaultData };
    });

    this.customPacks.set(packId, {
      manifest: serialized.manifest,
      nodes,
      subflowDefinitions: subflowDefs,
    });
  }

  private updateSerializedPack(packId: string): void {
    const pack = this.customPacks.get(packId);
    const state = this.packStates.get(packId);
    if (!pack || !state) return;

    state.serializedPack = {
      manifest: pack.manifest as PackManifest & { kind: 'custom' },
      nodes: pack.nodes.map(n => ({
        nodeType: n.nodeType,
        defaultData: n.defaultData,
        subflow: pack.subflowDefinitions.get(n.nodeType.type)!,
      })).filter(n => n.subflow),
    };
  }

  private saveStates(): void {
    try {
      const states = Array.from(this.packStates.values());
      localStorage.setItem(STORAGE_KEYS.PACK_STATES, JSON.stringify(states));
    } catch {
      // localStorage full 등 무시
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

// 싱글톤
export const packRegistry = new PackRegistry();
