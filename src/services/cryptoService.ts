import CryptoJS from "crypto-js";
import fs from "fs";
import path from "path";

class CryptoService {
  private secretKey: string;
  private readonly keyPath = path.join(process.cwd(), ".keys");
  private readonly keyFile = path.join(this.keyPath, "aes.key");

  constructor() {
    this.secretKey = this.loadOrGenerateKey();
  }

  // AES 키 로드 또는 생성
  private loadOrGenerateKey(): string {
    // 기존 키가 있으면 로드
    if (fs.existsSync(this.keyFile)) {
      const key = fs.readFileSync(this.keyFile, "utf8");
      return key;
    }

    // 새 키 생성 (256bit 랜덤 키)
    const key = CryptoJS.lib.WordArray.random(256 / 8).toString();

    // 키 저장 디렉토리 생성
    if (!fs.existsSync(this.keyPath)) {
      fs.mkdirSync(this.keyPath, { recursive: true });
    }

    // 키 파일 저장
    fs.writeFileSync(this.keyFile, key);
    return key;
  }

  // 암호화 키 반환 (프론트엔드에서 사용)
  getEncryptionKey(): string {
    return this.secretKey;
  }

  // 복호화 (백엔드에서 사용)
  decrypt(encryptedData: string): string {
    try {

      // AES 복호화
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const result = bytes.toString(CryptoJS.enc.Utf8);

      if (!result) {
        throw new Error("복호화 결과가 비어있습니다");
      }

      return result;
    } catch (error) {
      console.error("복호화 실패:", error);
      throw new Error("복호화에 실패했습니다");
    }
  }

  // 암호화 (테스트용)
  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.secretKey).toString();
  }
}

export default new CryptoService();
