# MongoDB Atlas에서 로컬 MongoDB로 마이그레이션하기

## 개요

개발 환경에서 MongoDB Atlas(클라우드)를 사용하다가 로컬 MongoDB로 전환하는 과정을 정리했습니다. 인터넷 연결 없이도 개발할 수 있고, 데이터베이스 비용도 절감할 수 있는 장점이 있습니다.

## 환경

- Node.js + TypeScript
- Mongoose ODM
- MongoDB Compass (GUI 도구)
- pnpm (패키지 매니저)

---

## 1단계: 로컬 MongoDB 설치

### Windows

[MongoDB Community Server](https://www.mongodb.com/try/download/community)에서 다운로드 후 설치합니다.

### Docker 사용 시

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 설치 확인

MongoDB Compass에서 `mongodb://localhost:27017`로 연결되는지 확인합니다.

---

## 2단계: 환경 변수 수정

`.env` 파일에서 `MONGODB_URI`를 로컬 주소로 변경합니다.

**변경 전 (Atlas)**

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

**변경 후 (Local)**

```env
MONGODB_URI=mongodb://localhost:27017/letter-db
```

---

## 3단계: 데이터 마이그레이션

로컬 MongoDB는 빈 상태이므로, Atlas에 있던 기존 데이터를 복사해야 합니다.

### 마이그레이션 스크립트 작성

`scripts/migrateFromCloud.ts` 파일을 생성합니다:

```typescript
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Atlas MongoDB URI (클라우드)
const CLOUD_URI = "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority";
// 로컬 MongoDB URI
const LOCAL_URI = "mongodb://localhost:27017/letter-db";

async function migrateData() {
  try {
    console.log("🔄 Atlas → Local 데이터 마이그레이션 시작...");

    // Atlas 연결
    const cloudConnection = mongoose.createConnection(CLOUD_URI);
    await cloudConnection.asPromise();
    console.log("✅ Atlas MongoDB 연결 완료");

    // 로컬 연결
    const localConnection = mongoose.createConnection(LOCAL_URI);
    await localConnection.asPromise();
    console.log("✅ Local MongoDB 연결 완료");

    const cloudDb = cloudConnection.db;
    const localDb = localConnection.db;

    if (!cloudDb || !localDb) {
      throw new Error("Database connection failed");
    }

    // 컬렉션 목록 가져오기
    const collections = await cloudDb.listCollections().toArray();
    console.log(`📋 ${collections.length}개 컬렉션 발견`);

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`🔄 마이그레이션 중: ${collectionName}`);

      // Atlas에서 데이터 가져오기
      const cloudCollection = cloudDb.collection(collectionName);
      const documents = await cloudCollection.find({}).toArray();

      if (documents.length > 0) {
        // 로컬에 데이터 삽입
        const localCollection = localDb.collection(collectionName);
        await localCollection.deleteMany({}); // 기존 데이터 삭제
        await localCollection.insertMany(documents);
        console.log(`✅ ${collectionName}: ${documents.length}개 문서 마이그레이션 완료`);
      } else {
        console.log(`⚠️ ${collectionName}: 데이터 없음`);
      }
    }

    console.log("🎉 마이그레이션 완료!");

    await cloudConnection.close();
    await localConnection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  }
}

migrateData();
```

### package.json에 스크립트 추가

```json
{
  "scripts": {
    "migrate:from-cloud": "ts-node scripts/migrateFromCloud.ts"
  }
}
```

### 마이그레이션 실행

```bash
pnpm migrate:from-cloud
```

**실행 결과:**

```
🔄 Atlas → Local 데이터 마이그레이션 시작...
✅ Atlas MongoDB 연결 완료
✅ Local MongoDB 연결 완료
📋 3개 컬렉션 발견
🔄 마이그레이션 중: tests
✅ tests: 1개 문서 마이그레이션 완료
🔄 마이그레이션 중: letters
✅ letters: 13개 문서 마이그레이션 완료
🔄 마이그레이션 중: users
✅ users: 3개 문서 마이그레이션 완료
🎉 마이그레이션 완료!
```

---

## 4단계: 서버 실행 및 확인

```bash
pnpm dev
```

**출력:**

```
✅ MongoDB connected successfully
✅ Server running on port 5001 in development mode
🚀 API available at http://localhost:5001/
```

MongoDB Compass에서 `letter-db` 데이터베이스를 확인하면 모든 컬렉션과 데이터가 정상적으로 마이그레이션된 것을 볼 수 있습니다.

---

## 환경별 설정 관리 (선택사항)

개발/운영 환경을 분리하여 관리할 수 있습니다.

### .env.local (로컬 개발용)

```env
MONGODB_URI=mongodb://localhost:27017/letter-db
```

### .env.production (운영용)

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
```

---

## 주의사항

1. **마이그레이션 스크립트의 Atlas URI**: 스크립트에 하드코딩된 Atlas URI는 마이그레이션 후 제거하거나 환경 변수로 분리하는 것이 좋습니다.

2. **데이터 동기화**: 마이그레이션은 일회성 복사입니다. Atlas와 로컬 간 실시간 동기화가 필요하다면 별도 솔루션이 필요합니다.

3. **인덱스**: 이 스크립트는 문서만 복사합니다. 인덱스가 필요하다면 Mongoose 스키마에 정의하거나 별도로 생성해야 합니다.

---

## 결론

MongoDB Atlas에서 로컬 MongoDB로 전환하는 과정은 크게 어렵지 않습니다:

1. 로컬 MongoDB 설치
2. 환경 변수 변경
3. 데이터 마이그레이션 스크립트 실행

이제 인터넷 연결 없이도 개발할 수 있고, 로컬에서 자유롭게 데이터를 테스트할 수 있습니다!
