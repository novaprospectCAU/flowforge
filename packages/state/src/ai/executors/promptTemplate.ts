/**
 * Prompt Template 노드 실행자
 */

import { executorRegistry } from '../../execution/executorRegistry';
import type { ExecutionContext, ExecutionResult } from '../../execution/types';

/**
 * 템플릿 변수 패턴 ({{variable}} 형식)
 */
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * 템플릿에서 변수 목록 추출
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(VARIABLE_PATTERN);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}

/**
 * 템플릿 치환
 */
export function substituteTemplate(
  template: string,
  values: Record<string, unknown>
): string {
  return template.replace(VARIABLE_PATTERN, (_, name) => {
    const value = values[name];
    if (value === undefined || value === null) {
      return `{{${name}}}`;
    }
    return String(value);
  });
}

/**
 * Prompt Template 노드 실행자 등록
 */
executorRegistry.register(
  'PromptTemplate',
  async (ctx: ExecutionContext): Promise<ExecutionResult> => {
    const { nodeData, inputs } = ctx;

    // 템플릿 가져오기
    const template = (nodeData.template as string) || '';

    if (!template) {
      return {
        outputs: { prompt: '' },
        error: 'No template provided',
      };
    }

    // 변수 값 매핑 구성
    // 입력 포트: var1, var2, var3, ...
    // 또는 노드 데이터의 variables 객체
    const values: Record<string, unknown> = {};

    // 입력 포트에서 값 가져오기
    for (const [key, value] of Object.entries(inputs)) {
      if (value !== undefined) {
        values[key] = value;
      }
    }

    // 노드 데이터의 variables에서 추가 값 가져오기
    const nodeVariables = nodeData.variables as Record<string, unknown> | undefined;
    if (nodeVariables) {
      for (const [key, value] of Object.entries(nodeVariables)) {
        if (values[key] === undefined && value !== undefined) {
          values[key] = value;
        }
      }
    }

    // 원본 템플릿에서 변수 추출
    const templateVars = extractVariables(template);

    // 템플릿 치환
    const result = substituteTemplate(template, values);

    // 미치환 = 원본 변수 중 값이 제공되지 않은 것
    const remainingVars = templateVars.filter(v => values[v] === undefined || values[v] === null);
    const hasUnsubstituted = remainingVars.length > 0;

    return {
      outputs: { prompt: result },
      nodeDataUpdate: {
        lastResult: result,
        hasUnsubstituted,
        unsubstitutedVars: remainingVars,
      },
    };
  }
);
