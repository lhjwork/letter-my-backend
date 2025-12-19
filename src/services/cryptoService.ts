import NodeRSA from "node-rsa";
import fs from "fs";
import path from "path";

class CryptoService {
  private key: NodeRSA;
  private publicKey: string;
  private readonly keyPath = path.join(process.cwd(), ".keys");
  private readonly privateKeyFile = path.join(this.keyPath, "private.pem");
  private readonly publicKeyFile = path.join(this.keyPath, "public.pem");

  constructor() {
    this.key = this.loadOrGenerateKey();
    this.publicKey = this.key.exportKey("public");
  }

  // 키 로드 또는 생성
  private loadOrGenerateKey(): NodeRSA {
    // 기존 키가 있으면 로드
    if (fs.existsSync(this.privateKeyFile) && fs.existsSync(this.publicKeyFile)) {
      const privateKey = fs.readFileSync(this.privateKeyFile, "utf8");
      const key = new NodeRSA(privateKey);
      console.log("✅ RSA 키 로드 완료");
      return key;
    }

    // 새 키 생성
    const key = new NodeRSA({ b: 2048 });

    // 키 저장 디렉토리 생성
    if (!fs.existsSync(this.keyPath)) {
      fs.mkdirSync(this.keyPath, { recursive: true });
    }

    // 키 파일 저장
    fs.writeFileSync(this.privateKeyFile, key.exportKey("private"));
    fs.writeFileSync(this.publicKeyFile, key.exportKey("public"));

    console.log("✅ RSA 키 생성 완료");
    return key;
  }

  // 공개키 반환 (프론트엔드에서 사용)
  getPublicKey(): string {
    return this.publicKey;
  }

  // 복호화 (백엔드에서 사용)
  decrypt(encryptedData: string): string {
    try {
      return this.key.decrypt(encryptedData, "utf8");
    } catch {
      throw new Error("복호화에 실패했습니다");
    }
  }

  // 암호화 (테스트용)
  encrypt(data: string): string {
    return this.key.encrypt(data, "base64");
  }
}

export default new CryptoService();
