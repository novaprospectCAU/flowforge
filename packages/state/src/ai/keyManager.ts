/**
 * API 키 관리자
 * IndexedDB + Web Crypto API를 사용한 보안 키 저장
 */

import type { AIProviderType, APIKeyEntry, MaskedAPIKeyEntry } from './types';
import { DB_CONFIG } from '../utils';
const STORE_NAME = 'api-keys';

// 암호화 설정
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const SALT = new Uint8Array([
  0x66, 0x6c, 0x6f, 0x77, 0x66, 0x6f, 0x72, 0x67, 0x65, 0x2d, 0x73, 0x61, 0x6c, 0x74, 0x2d, 0x31,
]);

/**
 * API 키 관리 클래스
 */
class KeyManager {
  private db: IDBDatabase | null = null;
  private cryptoKey: CryptoKey | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * KeyManager 초기화
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // IndexedDB 초기화
      this.db = await this.openDatabase();

      // 암호화 키 생성/로드
      this.cryptoKey = await this.getOrCreateCryptoKey();
    })();

    return this.initPromise;
  }

  /**
   * IndexedDB 열기
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.AI_DB_NAME, DB_CONFIG.AI_DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * 암호화 키 생성 또는 로드
   */
  private async getOrCreateCryptoKey(): Promise<CryptoKey> {
    // 브라우저 고유 정보를 기반으로 키 생성 (단순화된 접근법)
    // 실제 프로덕션에서는 더 안전한 키 관리가 필요
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(DB_CONFIG.LOCAL_KEY_SALT),
      KEY_DERIVATION_ALGORITHM,
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: KEY_DERIVATION_ALGORITHM,
        salt: SALT,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: ENCRYPTION_ALGORITHM, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * API 키 암호화
   */
  private async encryptKey(plainKey: string): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('KeyManager not initialized');
    }

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      this.cryptoKey,
      encoder.encode(plainKey)
    );

    // IV와 암호문을 합쳐서 base64로 인코딩
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * API 키 복호화
   */
  private async decryptKey(encryptedKey: string): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('KeyManager not initialized');
    }

    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      this.cryptoKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * API 키 마스킹
   */
  private maskKey(key: string): string {
    if (key.length <= 8) {
      return '****';
    }
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  /**
   * 새 API 키 저장
   */
  async saveKey(provider: AIProviderType, name: string, key: string): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const encryptedKey = await this.encryptKey(key);

    const entry: APIKeyEntry = {
      id,
      provider,
      name,
      key: encryptedKey,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(id);
    });
  }

  /**
   * API 키 조회 (복호화됨)
   */
  async getKey(keyId: string): Promise<string | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const entry = await this.getEntry(keyId);
    if (!entry) return null;

    // 마지막 사용 시간 업데이트
    await this.updateLastUsed(keyId);

    return this.decryptKey(entry.key);
  }

  /**
   * 환경 변수에서 키 조회
   * 애플리케이션에서 setEnvKeys를 통해 설정
   */
  private envKeys: Record<AIProviderType, string | null> = {
    openai: null,
    anthropic: null,
  };

  /**
   * 환경 변수 키 설정 (앱 초기화 시 호출)
   */
  setEnvKeys(keys: Partial<Record<AIProviderType, string>>): void {
    if (keys.openai) this.envKeys.openai = keys.openai;
    if (keys.anthropic) this.envKeys.anthropic = keys.anthropic;
  }

  /**
   * 환경 변수에서 키 조회
   */
  getEnvKey(provider: AIProviderType): string | null {
    return this.envKeys[provider] || null;
  }

  /**
   * 키 엔트리 조회
   */
  private getEntry(keyId: string): Promise<APIKeyEntry | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(keyId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * 마지막 사용 시간 업데이트
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    const entry = await this.getEntry(keyId);
    if (!entry) return;

    entry.lastUsedAt = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 저장된 키 목록 조회 (마스킹됨)
   */
  async listKeys(): Promise<MaskedAPIKeyEntry[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const entries: APIKeyEntry[] = request.result;
        const masked: MaskedAPIKeyEntry[] = [];

        for (const entry of entries) {
          try {
            const decrypted = await this.decryptKey(entry.key);
            masked.push({
              id: entry.id,
              provider: entry.provider,
              name: entry.name,
              maskedKey: this.maskKey(decrypted),
              createdAt: entry.createdAt,
              lastUsedAt: entry.lastUsedAt,
            });
          } catch {
            // 복호화 실패 시 스킵
          }
        }

        resolve(masked);
      };
    });
  }

  /**
   * 프로바이더별 키 목록 조회
   */
  async listKeysByProvider(provider: AIProviderType): Promise<MaskedAPIKeyEntry[]> {
    const allKeys = await this.listKeys();
    return allKeys.filter(k => k.provider === provider);
  }

  /**
   * API 키 삭제
   */
  async deleteKey(keyId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(keyId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 키 이름 업데이트
   */
  async updateKeyName(keyId: string, name: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const entry = await this.getEntry(keyId);
    if (!entry) throw new Error('Key not found');

    entry.name = name;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// 싱글톤 인스턴스
export const keyManager = new KeyManager();
