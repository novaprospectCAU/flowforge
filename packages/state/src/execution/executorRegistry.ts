import type { NodeExecutor } from './types';

/**
 * 노드 실행자 레지스트리
 * 노드 타입별로 실행 함수를 등록하고 조회
 */
class ExecutorRegistry {
  private executors: Map<string, NodeExecutor> = new Map();

  /**
   * 노드 타입에 대한 실행자 등록
   */
  register(nodeType: string, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  /**
   * 노드 타입에 대한 실행자 조회
   */
  get(nodeType: string): NodeExecutor | undefined {
    return this.executors.get(nodeType);
  }

  /**
   * 노드 타입에 대한 실행자가 있는지 확인
   */
  has(nodeType: string): boolean {
    return this.executors.has(nodeType);
  }

  /**
   * 노드 타입에 대한 실행자 제거
   */
  unregister(nodeType: string): boolean {
    return this.executors.delete(nodeType);
  }

  /**
   * 등록된 모든 노드 타입 목록
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}

// 싱글톤 인스턴스
export const executorRegistry = new ExecutorRegistry();
