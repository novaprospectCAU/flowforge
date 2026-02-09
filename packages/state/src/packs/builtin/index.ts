/**
 * 빌트인 팩 등록
 */
import { packRegistry } from '../packRegistry';
import { createMathPack } from './mathPack';
import { createAIEngineerPack } from './aiEngineerPack';

export function registerBuiltinPacks(): void {
  packRegistry.registerBuiltinPack(createMathPack());
  packRegistry.registerBuiltinPack(createAIEngineerPack());
}
